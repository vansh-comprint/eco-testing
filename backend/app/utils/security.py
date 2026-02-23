"""
Security utilities for input validation, sanitization, and access control.

This module provides comprehensive security functions to prevent:
- SSRF (Server-Side Request Forgery)
- XSS (Cross-Site Scripting)
- IDOR (Insecure Direct Object Reference)
- Input validation bypasses
- Rate limiting evasion
"""

import re
import html
import ipaddress
from typing import Optional, List
from urllib.parse import urlparse
from decimal import Decimal, InvalidOperation

from app.models.user import User, UserRole
from app.utils.exceptions import AuthorizationError, ValidationError


# =============================================================================
# ROLE HIERARCHY FOR IDOR PROTECTION
# =============================================================================

ROLE_HIERARCHY = {
    UserRole.SUPER_ADMIN.value: 5,
    UserRole.OPS_ADMIN.value: 4,
    UserRole.ORG_ADMIN.value: 3,
    UserRole.IT_ADMIN.value: 2,
    UserRole.LOGISTICS_ADMIN.value: 2,
    UserRole.LOGISTICS_USER.value: 1,
    UserRole.EMPLOYEE.value: 0,
}


def get_role_level(role: str) -> int:
    """Get the hierarchy level for a role."""
    return ROLE_HIERARCHY.get(role, 0)


def can_modify_user(actor: User, target_user_id: str, target_role: str,
                    target_enterprise_id: Optional[str] = None) -> bool:
    """
    Check if actor can modify target user.

    Rules:
    1. Super Admin can modify anyone except other Super Admins (unless same user)
    2. OPS Admin can modify anyone below them in hierarchy
    3. Org Admin can only modify users in their enterprise with lower hierarchy
    4. IT Admin can only modify users in their branch with lower hierarchy
    5. No one can modify users with equal or higher hierarchy (except self)

    Args:
        actor: The user performing the action
        target_user_id: ID of user being modified
        target_role: Role of user being modified
        target_enterprise_id: Enterprise ID of target user

    Returns:
        True if modification is allowed
    """
    # Users can always modify themselves (limited fields)
    if actor.id == target_user_id:
        return True

    actor_level = get_role_level(actor.role)
    target_level = get_role_level(target_role)

    # Cannot modify users at or above your level
    if target_level >= actor_level:
        # Exception: Super Admin can modify other Super Admins
        if actor.role == UserRole.SUPER_ADMIN.value and target_role == UserRole.SUPER_ADMIN.value:
            return True
        return False

    # Super Admin can modify anyone below them
    if actor.role == UserRole.SUPER_ADMIN.value:
        return True

    # OPS Admin can modify anyone below them
    if actor.role == UserRole.OPS_ADMIN.value:
        return True

    # Org Admin - can only modify within their enterprise
    if actor.role == UserRole.ORG_ADMIN.value:
        if target_enterprise_id and actor.enterprise_id != target_enterprise_id:
            return False
        return True

    # IT Admin - can only modify within their branch
    if actor.role == UserRole.IT_ADMIN.value:
        if target_enterprise_id and actor.enterprise_id != target_enterprise_id:
            return False
        # Additional branch check would be done in service layer
        return True

    # Logistics Admin - can only modify logistics users under them
    if actor.role == UserRole.LOGISTICS_ADMIN.value:
        if target_role != UserRole.LOGISTICS_USER.value:
            return False
        return True

    return False


def validate_user_modification(actor: User, target_user_id: str, target_role: str,
                               target_enterprise_id: Optional[str] = None,
                               target_status: Optional[str] = None) -> None:
    """
    Validate that actor can modify target user. Raises AuthorizationError if not allowed.

    Additional checks:
    - Cannot suspend/delete Super Admin unless you're Super Admin
    - Cannot change role to higher than your own
    """
    if not can_modify_user(actor, target_user_id, target_role, target_enterprise_id):
        raise AuthorizationError(
            f"You don't have permission to modify this user. "
            f"Your role: {actor.role}, Target role: {target_role}"
        )

    # Special check: Only Super Admin can suspend/delete Super Admin
    if target_role == UserRole.SUPER_ADMIN.value:
        if actor.role != UserRole.SUPER_ADMIN.value:
            if target_status in ['suspended', 'inactive']:
                raise AuthorizationError(
                    "Only Super Admin can suspend or deactivate another Super Admin"
                )


def can_access_wallet(user: User, enterprise_id: str) -> bool:
    """
    Check if user can access a specific enterprise's wallet.

    Rules:
    - Super Admin / OPS Admin can access all
    - Org Admin can access their own enterprise
    - Others cannot access wallets
    """
    if user.role in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
        return True
    if user.role == UserRole.ORG_ADMIN.value:
        return user.enterprise_id == enterprise_id
    return False


def validate_wallet_access(user: User, enterprise_id: str) -> None:
    """Validate wallet access, raise AuthorizationError if denied."""
    if not can_access_wallet(user, enterprise_id):
        raise AuthorizationError(
            f"You don't have permission to access wallet for enterprise {enterprise_id}"
        )


# =============================================================================
# URL VALIDATION (SSRF PREVENTION)
# =============================================================================

# Dangerous protocols that should never be allowed
DANGEROUS_PROTOCOLS = {
    'file', 'ftp', 'sftp', 'gopher', 'dict', 'ldap', 'ldaps',
    'tftp', 'telnet', 'ssh', 'rmi', 'jar', 'netdoc', 'mailto',
    'javascript', 'data', 'vbscript', 'mhtml', 'netcat', 'nc',
    'redis', 'memcached', 'smtp', 'pop3', 'imap'
}

# Internal/private IP ranges
PRIVATE_IP_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('169.254.0.0/16'),  # Link-local
    ipaddress.ip_network('::1/128'),  # IPv6 localhost
    ipaddress.ip_network('fc00::/7'),  # IPv6 private
    ipaddress.ip_network('fe80::/10'),  # IPv6 link-local
]

# Cloud metadata endpoints
METADATA_ENDPOINTS = {
    '169.254.169.254',  # AWS, GCP, Azure
    'metadata.google.internal',
    '100.100.100.200',  # Alibaba Cloud
    'kubernetes.default.svc',
}

# Dangerous localhost aliases
LOCALHOST_ALIASES = {
    'localhost', '127.0.0.1', '::1', '0.0.0.0',
    'localhost.localdomain', '0', '127.1'
}


# Unicode confusables - characters that look like ASCII but aren't
# (declared here for use in validate_url, full implementation below)
_CONFUSABLE_CHARS = {
    # Cyrillic lookalikes
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y',
    'х': 'x', 'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M',
    'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
    # Greek lookalikes
    'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Η': 'H', 'Ι': 'I', 'Κ': 'K',
    'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Χ': 'X',
    'α': 'a', 'ο': 'o', 'ν': 'v',
}


def _has_confusable_chars(text: str) -> bool:
    """Quick check for confusable characters (used in validate_url)."""
    if not text:
        return False
    for char in text:
        if char in _CONFUSABLE_CHARS:
            return True
    return False


def is_private_ip(ip_str: str) -> bool:
    """Check if an IP address is private/internal."""
    try:
        # Handle decimal IP notation (e.g., 2130706433 = 127.0.0.1)
        if ip_str.isdigit():
            ip_int = int(ip_str)
            if ip_int > 0xFFFFFFFF:
                return True
            ip_str = str(ipaddress.ip_address(ip_int))

        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in PRIVATE_IP_RANGES)
    except (ValueError, ipaddress.AddressValueError):
        return False


def validate_url(url: str, allow_internal: bool = False) -> str:
    """
    Validate a URL for SSRF prevention.

    Args:
        url: URL to validate
        allow_internal: If True, allow internal/private IPs (default False)

    Returns:
        Validated URL

    Raises:
        ValidationError: If URL is invalid or potentially dangerous
    """
    if not url:
        return url

    # SECURITY: Length limit to prevent ReDoS attacks via complex URLs
    MAX_URL_LENGTH = 2048
    if len(url) > MAX_URL_LENGTH:
        raise ValidationError(f"URL exceeds maximum length of {MAX_URL_LENGTH} characters")

    # Remove null bytes and whitespace
    url = url.replace('\x00', '').strip()

    # Check for protocol-relative URLs
    if url.startswith('//'):
        raise ValidationError("Protocol-relative URLs are not allowed")

    try:
        parsed = urlparse(url)
    except Exception:
        raise ValidationError("Invalid URL format")

    # Check protocol
    scheme = parsed.scheme.lower()
    if not scheme:
        raise ValidationError("URL must include a protocol (http:// or https://)")

    if scheme in DANGEROUS_PROTOCOLS:
        raise ValidationError(f"Protocol '{scheme}' is not allowed")

    if scheme not in ('http', 'https'):
        raise ValidationError("Only HTTP and HTTPS URLs are allowed")

    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("URL must include a hostname")

    # Normalize hostname
    hostname_lower = hostname.lower()

    # Check for localhost aliases
    if hostname_lower in LOCALHOST_ALIASES:
        if not allow_internal:
            raise ValidationError("Localhost URLs are not allowed")

    # Check for metadata endpoints
    if hostname_lower in METADATA_ENDPOINTS:
        raise ValidationError("Cloud metadata endpoints are not allowed")

    # Check for nip.io and similar DNS rebinding services
    rebinding_services = ['nip.io', 'xip.io', 'sslip.io', 'localtest.me']
    for service in rebinding_services:
        if hostname_lower.endswith(f'.{service}') or hostname_lower == service:
            raise ValidationError(f"DNS rebinding service '{service}' is not allowed")

    # Check for data exfiltration services (webhook catchers, request bins, etc.)
    exfiltration_services = [
        'webhook.site', 'requestbin.com', 'pipedream.net', 'hookbin.com',
        'beeceptor.com', 'requestcatcher.com', 'mockbin.org', 'postb.in',
        'httpbin.org', 'requestinspector.com', 'webhook.do', 'req.dev',
        'burpcollaborator.net', 'oastify.com', 'interact.sh',
    ]
    for service in exfiltration_services:
        if hostname_lower.endswith(f'.{service}') or hostname_lower == service:
            raise ValidationError(
                f"Request logging service '{service}' is not allowed for security reasons"
            )

    # Check for Unicode homograph attacks in hostname
    if _has_confusable_chars(hostname):
        raise ValidationError(
            "URL hostname contains suspicious Unicode characters that could be used for spoofing"
        )

    # Check for private IPs
    if not allow_internal:
        # Check if hostname is an IP address
        if is_private_ip(hostname):
            raise ValidationError("Private/internal IP addresses are not allowed")

        # Check for port that indicates internal services
        port = parsed.port
        internal_ports = {
            # Databases
            5432, 3306, 6379, 27017, 9200, 9300, 5984,  # PostgreSQL, MySQL, Redis, MongoDB, Elasticsearch, CouchDB
            # Service discovery
            8500, 2379, 2181,  # Consul, etcd, Zookeeper
            # Secrets management
            8200,  # Vault
            # Common internal web
            8080, 8443, 8088,  # Common web, K8s API, Splunk HEC
            # Message queues
            15672, 5672,  # RabbitMQ
            # Monitoring
            9090, 3000, 8983,  # Prometheus, Grafana, Solr
            # Network protocols
            25, 587,  # SMTP
            11211,  # Memcached
        }
        if port in internal_ports:
            raise ValidationError(f"Port {port} is commonly used for internal services")

    # Check for JSONP callback parameters which could be used for XSS
    query = parsed.query.lower() if parsed.query else ''
    jsonp_params = ['callback=', 'jsonp=', 'cb=', 'jsonpcallback=']
    for param in jsonp_params:
        if param in query:
            raise ValidationError(
                "URLs with JSONP callback parameters are not allowed for security reasons"
            )

    return url


def validate_urls(urls: List[str], allow_internal: bool = False) -> List[str]:
    """Validate a list of URLs."""
    validated = []
    for url in urls:
        validated.append(validate_url(url, allow_internal))
    return validated


# =============================================================================
# INPUT SANITIZATION
# =============================================================================

def sanitize_html(text: str) -> str:
    """
    Sanitize text by escaping HTML entities.
    Use this for text that will be rendered in HTML context.
    """
    if not text:
        return text
    return html.escape(text)


def strip_dangerous_content(text: str) -> str:
    """
    Remove potentially dangerous content from text input.

    Strips:
    - HTML tags
    - JavaScript code
    - Event handlers
    - Null bytes
    - Control characters
    """
    if not text:
        return text

    # Remove null bytes
    text = text.replace('\x00', '')

    # Remove control characters except newlines and tabs
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Remove common XSS patterns
    xss_patterns = [
        r'javascript\s*:',
        r'vbscript\s*:',
        r'data\s*:',
        r'on\w+\s*=',  # Event handlers like onclick, onerror
        r'expression\s*\(',
    ]
    for pattern in xss_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    return text


def validate_text_length(text: str, max_length: int = 10000,
                         field_name: str = "text") -> str:
    """Validate text doesn't exceed maximum length (DoS prevention)."""
    if text and len(text) > max_length:
        raise ValidationError(
            f"{field_name} exceeds maximum length of {max_length} characters"
        )
    return text


# =============================================================================
# FINANCIAL VALIDATION
# =============================================================================

# Maximum payout amount in INR (1 Crore = 10 Million)
MAX_PAYOUT_AMOUNT = Decimal('10000000')  # ₹1 Crore
MIN_TRANSACTION_AMOUNT = Decimal('1')  # ₹1


def validate_amount(amount: float, field_name: str = "amount",
                    min_amount: Optional[Decimal] = None,
                    max_amount: Optional[Decimal] = None) -> Decimal:
    """
    Validate a monetary amount.

    Args:
        amount: Amount to validate
        field_name: Name of field for error messages
        min_amount: Minimum allowed amount (default: 1)
        max_amount: Maximum allowed amount (default: 1 Crore)

    Returns:
        Validated Decimal amount

    Raises:
        ValidationError: If amount is invalid
    """
    if min_amount is None:
        min_amount = MIN_TRANSACTION_AMOUNT
    if max_amount is None:
        max_amount = MAX_PAYOUT_AMOUNT

    try:
        amount_decimal = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"Invalid {field_name}: must be a valid number")

    if amount_decimal < min_amount:
        raise ValidationError(
            f"{field_name} must be at least {min_amount}"
        )

    if amount_decimal > max_amount:
        raise ValidationError(
            f"{field_name} cannot exceed {max_amount}"
        )

    # Check for too many decimal places (only 2 allowed for currency)
    if amount_decimal.as_tuple().exponent < -2:
        raise ValidationError(
            f"{field_name} cannot have more than 2 decimal places"
        )

    return amount_decimal


# =============================================================================
# FORMAT VALIDATION
# =============================================================================

# IFSC code format: 4 letters, 0, 6 alphanumeric
IFSC_PATTERN = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')

# UPI ID format: username@provider
UPI_PATTERN = re.compile(r'^[\w.\-]+@[\w]+$')

# Indian phone number (10 digits, optionally with +91)
PHONE_PATTERN = re.compile(r'^(\+91)?[6-9]\d{9}$')

# Email format
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# PIN code (6 digits)
PINCODE_PATTERN = re.compile(r'^\d{6}$')

# GST number format
GST_PATTERN = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$')


def validate_ifsc(ifsc: str) -> str:
    """Validate IFSC code format."""
    if not ifsc:
        return ifsc
    ifsc = ifsc.upper().strip()
    if not IFSC_PATTERN.match(ifsc):
        raise ValidationError(
            "Invalid IFSC code format. Must be 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)"
        )
    return ifsc


def validate_upi(upi_id: str) -> str:
    """Validate UPI ID format."""
    if not upi_id:
        return upi_id
    upi_id = upi_id.strip()

    # Remove XSS attempts
    upi_id = strip_dangerous_content(upi_id)

    if not UPI_PATTERN.match(upi_id):
        raise ValidationError(
            "Invalid UPI ID format. Must be in format: username@provider"
        )
    return upi_id


def validate_phone(phone: str) -> str:
    """Validate Indian phone number format."""
    if not phone:
        return phone
    phone = phone.strip().replace(' ', '').replace('-', '')
    if not PHONE_PATTERN.match(phone):
        raise ValidationError(
            "Invalid phone number. Must be 10 digits starting with 6-9"
        )
    return phone


def validate_email(email: str) -> str:
    """Validate email format."""
    if not email:
        return email
    email = email.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise ValidationError("Invalid email format")
    return email


def validate_pincode(pincode: str) -> str:
    """Validate Indian PIN code format."""
    if not pincode:
        return pincode
    pincode = pincode.strip()
    if not PINCODE_PATTERN.match(pincode):
        raise ValidationError("Invalid PIN code. Must be 6 digits")
    return pincode


def validate_gst(gst: str) -> str:
    """Validate GST number format."""
    if not gst:
        return gst
    gst = gst.upper().strip()
    if not GST_PATTERN.match(gst):
        raise ValidationError(
            "Invalid GST format. Must be 15 characters in standard format"
        )
    return gst


# =============================================================================
# DATE VALIDATION
# =============================================================================

from datetime import date, timedelta  # noqa: E402


def validate_pickup_date(pickup_date: date) -> date:
    """
    Validate pickup date is reasonable.

    Rules:
    - Cannot be in the past
    - Cannot be more than 90 days in the future
    """
    today = date.today()

    if pickup_date < today:
        raise ValidationError("Pickup date cannot be in the past")

    max_date = today + timedelta(days=90)
    if pickup_date > max_date:
        raise ValidationError("Pickup date cannot be more than 90 days in the future")

    return pickup_date


# =============================================================================
# CSV INJECTION PREVENTION
# =============================================================================

CSV_DANGEROUS_CHARS = {'=', '+', '-', '@', '\t', '\r', '\n'}


def sanitize_for_csv(value: str) -> str:
    """
    Sanitize a value for safe CSV export.

    Prevents formula injection attacks.
    """
    if not value:
        return value

    # If value starts with a dangerous character, prefix with single quote
    if value[0] in CSV_DANGEROUS_CHARS:
        value = f"'{value}"

    return value


# =============================================================================
# NULL BYTE PROTECTION
# =============================================================================


def strip_null_bytes(text: str) -> str:
    """
    Remove null bytes from input string.

    Null bytes can cause:
    - Path traversal in file operations
    - String truncation in C-based backends
    - Validation bypass attacks

    Args:
        text: Input string to sanitize

    Returns:
        String with null bytes removed
    """
    if not text:
        return text
    return text.replace('\x00', '')


def validate_no_null_bytes(text: str, field_name: str = "input") -> str:
    """
    Validate that input contains no null bytes.

    Raises ValidationError if null bytes are found rather than silently removing.
    Use when you want to reject rather than sanitize.
    """
    if not text:
        return text
    if '\x00' in text:
        raise ValidationError(f"{field_name} contains invalid characters (null bytes)")
    return text


# =============================================================================
# JSON/DICT SANITIZATION (Prototype Pollution Prevention)
# =============================================================================

# Keys that could cause prototype pollution or other injection attacks
DANGEROUS_KEYS = {
    '__proto__',
    'constructor',
    'prototype',
    '__class__',
    '__bases__',
    '__mro__',
    '__subclasses__',
    '__init__',
    '__globals__',
    '__builtins__',
    '__import__',
    '__code__',
    '__reduce__',
    '__reduce_ex__',
    '__getstate__',
    '__setstate__',
    # LDAP injection via keys
    'objectClass',
    'dn',
    'cn',
    'uid',
    'userPassword',
}


def sanitize_dict_keys(data: dict, field_name: str = "data") -> dict:
    """
    Sanitize dictionary keys to prevent prototype pollution and injection attacks.

    Args:
        data: Dictionary to sanitize
        field_name: Name of field for error messages

    Returns:
        Sanitized dictionary with dangerous keys removed

    Raises:
        ValidationError: If data is not a dictionary or contains dangerous patterns
    """
    if data is None:
        return data

    if not isinstance(data, dict):
        raise ValidationError(f"{field_name} must be a dictionary")

    def _sanitize_recursive(obj, path=""):
        if isinstance(obj, dict):
            sanitized = {}
            for key, value in obj.items():
                # Check for dangerous keys
                key_lower = str(key).lower()
                if key in DANGEROUS_KEYS or key_lower in DANGEROUS_KEYS:
                    # Skip dangerous keys silently
                    continue

                # Check for keys that look like injection attempts
                if any(pattern in key_lower for pattern in ['__', 'ldap:', 'jndi:', '${', '{{']):
                    continue

                sanitized[key] = _sanitize_recursive(value, f"{path}.{key}")
            return sanitized
        elif isinstance(obj, list):
            return [_sanitize_recursive(item, f"{path}[]") for item in obj]
        elif isinstance(obj, str):
            # Sanitize string values
            return strip_dangerous_content(strip_null_bytes(obj))
        else:
            return obj

    return _sanitize_recursive(data)


# =============================================================================
# UNICODE HOMOGRAPH DETECTION
# =============================================================================

# Unicode confusables - characters that look like ASCII but aren't
CONFUSABLE_CHARS = {
    # Cyrillic lookalikes
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y',
    'х': 'x', 'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M',
    'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
    # Greek lookalikes
    'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Η': 'H', 'Ι': 'I', 'Κ': 'K',
    'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Χ': 'X',
    'α': 'a', 'ο': 'o', 'ν': 'v',
}


def detect_homograph_attack(text: str) -> bool:
    """
    Detect potential Unicode homograph attack in text.

    Returns True if text contains confusable characters that could
    be used in a homograph attack.
    """
    if not text:
        return False

    for char in text:
        if char in CONFUSABLE_CHARS:
            return True
    return False


def validate_no_homographs(text: str, field_name: str = "input") -> str:
    """
    Validate that text contains no Unicode homograph characters.

    Args:
        text: Text to validate
        field_name: Name for error message

    Returns:
        The original text if valid

    Raises:
        ValidationError: If homograph characters are detected
    """
    if text and detect_homograph_attack(text):
        raise ValidationError(
            f"{field_name} contains suspicious Unicode characters that could be used for spoofing"
        )
    return text


def normalize_unicode_domain(hostname: str) -> str:
    """
    Normalize a hostname by replacing confusable Unicode characters.

    This helps detect homograph attacks on domain names.
    """
    if not hostname:
        return hostname

    result = []
    for char in hostname:
        if char in CONFUSABLE_CHARS:
            result.append(CONFUSABLE_CHARS[char])
        else:
            result.append(char)
    return ''.join(result)


# =============================================================================
# SSTI/INJECTION PATTERN DETECTION
# =============================================================================

# Patterns that indicate template injection or code execution attempts
INJECTION_PATTERNS = [
    # Jinja2/Flask SSTI
    r'\{\{.*\}\}',
    r'\{%.*%\}',
    r'\{\#.*\#\}',
    # Mako templates
    r'\$\{.*\}',
    # Expression language
    r'#\{.*\}',
    # Python code patterns
    r'__\w+__',
    r'import\s+\w+',
    r'eval\s*\(',
    r'exec\s*\(',
    r'compile\s*\(',
    r'open\s*\(',
    # SQL injection patterns
    r"'\s*or\s+'",
    r"'\s*or\s+1\s*=\s*1",
    r';\s*(drop|delete|update|insert|select|union)',
    r'pg_sleep\s*\(',
    r'sleep\s*\(',
    r'benchmark\s*\(',
    r'waitfor\s+delay',
    # LDAP injection
    r'\*\)\(\w+',
    r'\)\(\w+=\*',
    r'objectclass\s*=',
    # Log4j/JNDI
    r'\$\{jndi:',
    r'\$\{lower:',
    r'\$\{upper:',
    # Java serialization gadget chains (deserialization attacks)
    r'java\.lang\.Runtime',
    r'java\.lang\.ProcessBuilder',
    r'org\.apache\.commons\.collections',
    r'org\.apache\.xalan',
    r'com\.sun\.org\.apache',
    r'ysoserial',
    r'gadgetinspector',
    r'rO0AB',  # Base64 Java serialized object marker
]

# Pre-compiled patterns for performance
COMPILED_INJECTION_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def detect_injection_attempt(text: str) -> bool:
    """
    Detect potential injection attempts in text.

    Checks for SSTI, SQL injection, LDAP injection, and other attack patterns.

    Returns:
        True if injection pattern detected
    """
    if not text:
        return False

    for pattern in COMPILED_INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    return False


def validate_no_injection(text: str, field_name: str = "input") -> str:
    """
    Validate that text contains no injection patterns.

    Args:
        text: Text to validate
        field_name: Name for error message

    Returns:
        The original text if valid

    Raises:
        ValidationError: If injection pattern is detected
    """
    if text and detect_injection_attempt(text):
        raise ValidationError(
            f"{field_name} contains patterns that could indicate an injection attack"
        )
    return text


def sanitize_for_template(text: str) -> str:
    """
    Sanitize text for safe use in templates.

    Escapes template syntax to prevent SSTI.
    """
    if not text:
        return text

    # Escape template delimiters
    text = text.replace('{{', '&#123;&#123;')
    text = text.replace('}}', '&#125;&#125;')
    text = text.replace('{%', '&#123;&#37;')
    text = text.replace('%}', '&#37;&#125;')
    text = text.replace('${', '&#36;&#123;')

    return text
