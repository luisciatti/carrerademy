"""Security helpers live here once authentication is implemented."""


def get_password_hash(password: str) -> str:
    raise NotImplementedError("Password hashing is not implemented in this setup phase.")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    raise NotImplementedError("Password verification is not implemented in this setup phase.")


def verify_token(token: str) -> dict[str, str]:
    raise NotImplementedError("Token verification is not implemented in this setup phase.")