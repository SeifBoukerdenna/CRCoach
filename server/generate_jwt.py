import secrets
import string

def generate_jwt_secret(length=64):
    """Generate a cryptographically secure random JWT secret key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# Generate your JWT secret
jwt_secret = generate_jwt_secret()
print("Your secure JWT secret key:")
print(jwt_secret)
print("\nAdd this to your .env file:")
print(f"JWT_SECRET_KEY={jwt_secret}")