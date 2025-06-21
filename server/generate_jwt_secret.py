import secrets
import base64

def generate_jwt_secret():
    # Generate 48 random bytes (48 * 4/3 ≈ 64 base64 characters)
    random_bytes = secrets.token_bytes(48)
    jwt_secret = base64.b64encode(random_bytes).decode('utf-8')

    # Format it for .env style
    print(f"# JWT Secret for signing tokens (GENERATE A SECURE RANDOM STRING!)")
    print(f"# Use a password generator or: openssl rand -base64 64")
    print(f"JWT_SECRET={jwt_secret}")

if __name__ == "__main__":
    generate_jwt_secret()
