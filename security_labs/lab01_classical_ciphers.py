"""
================================================================================
NB6005CEM — Security (Coventry University / NIBM)
Lab Task 1: Classical Ciphers (Additive, Multiplicative, and Affine)
================================================================================
Author: Centinel Fin AI Security Lab
Topic: Algorithm-Level Classical Cryptography & Modular Arithmetic
Execution:
    python security_labs/lab01_classical_ciphers.py
================================================================================
"""

import math

# Valid keys for Multiplicative / Affine cipher mod 26: gcd(k, 26) must be 1
VALID_COPRIME_KEYS = [k for k in range(1, 26) if math.gcd(k, 26) == 1]
# [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25] -> Exactly 12 keys

def print_separator(title=""):
    print("\n" + "=" * 75)
    if title:
        print(f"  {title}")
        print("=" * 75)

# ------------------------------------------------------------------------------
# 1. ADDITIVE (CAESAR) CIPHER
# ------------------------------------------------------------------------------
def additive_encrypt(plaintext: str, key: int) -> str:
    """Encrypt using C = (P + K) mod 26."""
    ciphertext = []
    for char in plaintext:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            p = ord(char) - base
            c = (p + key) % 26
            ciphertext.append(chr(base + c))
        else:
            ciphertext.append(char)
    return "".join(ciphertext)

def additive_decrypt(ciphertext: str, key: int) -> str:
    """Decrypt using P = (C - K) mod 26."""
    return additive_encrypt(ciphertext, -key)


# ------------------------------------------------------------------------------
# 2. MULTIPLICATIVE CIPHER
# ------------------------------------------------------------------------------
def multiplicative_encrypt(plaintext: str, key: int) -> str:
    """
    Encrypt using C = (P * K) mod 26.
    Key must satisfy gcd(key, 26) == 1.
    """
    if math.gcd(key, 26) != 1:
        raise ValueError(f"Key {key} is invalid! gcd({key}, 26) = {math.gcd(key, 26)} != 1. "
                         f"Valid keys are: {VALID_COPRIME_KEYS}")
    ciphertext = []
    for char in plaintext:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            p = ord(char) - base
            c = (p * key) % 26
            ciphertext.append(chr(base + c))
        else:
            ciphertext.append(char)
    return "".join(ciphertext)

def multiplicative_decrypt(ciphertext: str, key: int) -> str:
    """
    Decrypt using P = (C * K^-1) mod 26.
    Where K^-1 is the modular multiplicative inverse of K modulo 26.
    """
    if math.gcd(key, 26) != 1:
        raise ValueError(f"Key {key} is invalid! No modular inverse exists modulo 26.")
    
    # In Python 3.8+, pow(key, -1, 26) computes the modular inverse via Extended Euclidean Alg
    key_inv = pow(key, -1, 26)
    
    plaintext = []
    for char in ciphertext:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            c = ord(char) - base
            p = (c * key_inv) % 26
            plaintext.append(chr(base + p))
        else:
            plaintext.append(char)
    return "".join(plaintext)


# ------------------------------------------------------------------------------
# 3. AFFINE CIPHER (Combination of Multiplicative + Additive)
# ------------------------------------------------------------------------------
def affine_encrypt(plaintext: str, k1: int, k2: int) -> str:
    """
    Encrypt using C = (k1 * P + k2) mod 26.
    k1 must satisfy gcd(k1, 26) == 1. k2 can be any integer in 0..25.
    """
    if math.gcd(k1, 26) != 1:
        raise ValueError(f"k1={k1} is invalid! gcd({k1}, 26) != 1.")
    
    ciphertext = []
    for char in plaintext:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            p = ord(char) - base
            c = (k1 * p + k2) % 26
            ciphertext.append(chr(base + c))
        else:
            ciphertext.append(char)
    return "".join(ciphertext)

def affine_decrypt(ciphertext: str, k1: int, k2: int) -> str:
    """
    Decrypt using P = k1^-1 * (C - k2) mod 26.
    """
    if math.gcd(k1, 26) != 1:
        raise ValueError(f"k1={k1} is invalid! No modular inverse exists modulo 26.")
    
    k1_inv = pow(k1, -1, 26)
    
    plaintext = []
    for char in ciphertext:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            c = ord(char) - base
            p = (k1_inv * (c - k2)) % 26
            plaintext.append(chr(base + p))
        else:
            plaintext.append(char)
    return "".join(plaintext)


# ------------------------------------------------------------------------------
# DEMO EXECUTION & CENTINEL FIN AI TEST
# ------------------------------------------------------------------------------
def main():
    print_separator("NB6005CEM LAB 01: CLASSICAL CIPHERS IN PYTHON")
    print("This lab demonstrates the three foundational monoalphabetic substitution ciphers")
    print("and proves why modular arithmetic and coprime keys are mathematically essential.\n")
    
    sample_text = "APPROVE PURCHASE 150 USD"
    print(f"Test Message (Centinel Fin AI Transaction): '{sample_text}'")

    # 1. Additive Cipher
    print_separator("PART 1: ADDITIVE (CAESAR) CIPHER [Shift = 7]")
    key_add = 7
    enc_add = additive_encrypt(sample_text, key_add)
    dec_add = additive_decrypt(enc_add, key_add)
    print(f"Plaintext   : {sample_text}")
    print(f"Ciphertext  : {enc_add}")
    print(f"Decrypted   : {dec_add}")
    assert dec_add == sample_text, "Additive Decryption Failed!"
    print("Status      : [PASS] Additive Encryption & Decryption Verified")

    # 2. Multiplicative Cipher
    print_separator("PART 2: MULTIPLICATIVE CIPHER [k1 = 5]")
    key_mult = 5
    key_mult_inv = pow(key_mult, -1, 26)
    print(f"Selected Key K1         : {key_mult} (gcd({key_mult}, 26) = {math.gcd(key_mult, 26)})")
    print(f"Calculated Inverse K1^-1: {key_mult_inv} (since {key_mult} * {key_mult_inv} = {key_mult * key_mult_inv} = 4 * 26 + 1 = 1 mod 26)")
    
    enc_mult = multiplicative_encrypt(sample_text, key_mult)
    dec_mult = multiplicative_decrypt(enc_mult, key_mult)
    print(f"Plaintext   : {sample_text}")
    print(f"Ciphertext  : {enc_mult}")
    print(f"Decrypted   : {dec_mult}")
    assert dec_mult == sample_text, "Multiplicative Decryption Failed!"
    print("Status      : [PASS] Multiplicative Encryption & Decryption Verified")

    # 2b. Failure Demonstration with Non-Coprime Key
    print("\nDemonstrating why non-coprime key (e.g. k1 = 2) fails:")
    try:
        multiplicative_encrypt(sample_text, 2)
    except ValueError as e:
        print(f"Expected Error caught: {e}")

    # 3. Affine Cipher
    print_separator("PART 3: AFFINE CIPHER [k1 = 7, k2 = 11]")
    k1, k2 = 7, 11
    k1_inv = pow(k1, -1, 26)
    print(f"Affine Keys             : k1={k1}, k2={k2}")
    print(f"k1 Inverse (k1^-1)      : {k1_inv}")
    print(f"Total Affine Key Space  : 12 valid k1 * 26 valid k2 = 312 keys")
    
    enc_affine = affine_encrypt(sample_text, k1, k2)
    dec_affine = affine_decrypt(enc_affine, k1, k2)
    print(f"Plaintext   : {sample_text}")
    print(f"Ciphertext  : {enc_affine}")
    print(f"Decrypted   : {dec_affine}")
    assert dec_affine == sample_text, "Affine Decryption Failed!"
    print("Status      : [PASS] Affine Encryption & Decryption Verified")

    print_separator("CW1 / CW2 COURSEWORK RELEVANCE SUMMARY")
    print("1. Why Monoalphabetic ciphers FAIL for Centinel Fin AI:")
    print("   Notice that repeated letters ('P', 'P') always map to identical ciphertext letters.")
    print("   An attacker eavesdropping on parent-approval tokens can deduce message structure.")
    print("2. Why Modern AES-256-GCM is Required:")
    print("   AES uses Claude Shannon's Confusion (S-Box) and Diffusion (P-Box/MixColumns)")
    print("   to completely eradicate letter-frequency patterns.")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    main()
