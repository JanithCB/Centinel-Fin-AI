"""
================================================================================
NB6005CEM — Security (Coventry University / NIBM)
Lab Task 6: Cryptographic Hash Functions (MD5 vs. SHA-256)
================================================================================
Author: Centinel Fin AI Security Lab
Topic: Algorithm-Level Security (Hashing, Integrity & The Avalanche Effect)

Run this file in your IDE terminal with:
    python security_labs/lab06_hashing.py
================================================================================
"""

import hashlib

def print_separator(title=""):
    print("\n" + "=" * 70)
    if title:
        print(f"  {title}")
        print("=" * 70)

def main():
    print_separator("WHAT IS A CRYPTOGRAPHIC HASH FUNCTION?")
    print("A hash function is a mathematical 'one-way fingerprint'.")
    print("You put any size text in -> you get a fixed-length fingerprint out.")
    print("Key rule: You can NEVER reverse a hash back into the original text!")

    # --------------------------------------------------------------------------
    # 1. Basic Hashing with SHA-256 (Secure Standard)
    # --------------------------------------------------------------------------
    print_separator("STEP 1: HASHING A SIMPLE MESSAGE (SHA-256)")
    message = "Payment of 15.00 USD approved for Book"
    
    # We convert the text string to bytes, then calculate the SHA-256 hash
    sha256_hash = hashlib.sha256(message.encode('utf-8')).hexdigest()
    
    print(f"Original Text: '{message}'")
    print(f"SHA-256 Hash : {sha256_hash}")
    print(f"Hash Length  : {len(sha256_hash)} characters (256 bits = 64 hex characters)")

    # --------------------------------------------------------------------------
    # 2. The Avalanche Effect (Crucial for CW1 & CW2)
    # --------------------------------------------------------------------------
    print_separator("STEP 2: THE AVALANCHE EFFECT (Tampering Detection)")
    print("What happens if an attacker tampers with just ONE character?")
    print("Let's change $15.00 to $15.01 (just a 1-cent difference):\n")

    message_original = "Payment of 15.00 USD approved for Book"
    message_tampered = "Payment of 15.01 USD approved for Book"

    hash_orig = hashlib.sha256(message_original.encode('utf-8')).hexdigest()
    hash_tamp = hashlib.sha256(message_tampered.encode('utf-8')).hexdigest()

    print(f"Original ($15.00) : {hash_orig}")
    print(f"Tampered ($15.01) : {hash_tamp}")
    print("\nObservation:")
    print("Changing just '0' to '1' completely scrambled the entire fingerprint!")
    print("This is how databases and blockchains instantly detect tampering.")

    # --------------------------------------------------------------------------
    # 3. MD5 vs. SHA-256 (Academic Comparison for Your Coursework)
    # --------------------------------------------------------------------------
    print_separator("STEP 3: MD5 vs. SHA-256 (Why MD5 is Obsolete)")
    md5_hash = hashlib.md5(message.encode('utf-8')).hexdigest()

    print(f"MD5 Hash    : {md5_hash} ({len(md5_hash)} characters / 128 bits)")
    print(f"SHA-256 Hash: {sha256_hash} ({len(sha256_hash)} characters / 256 bits)")
    print("\nCoursework Note:")
    print("- MD5 is broken: modern computers can find 'collisions' (two different")
    print("  inputs with the same MD5 hash) in seconds. NEVER use MD5 in production!")
    print("- SHA-256 (part of SHA-2 family) is current industry & banking standard.")

    # --------------------------------------------------------------------------
    # 4. Connection to Sentinel Fin AI
    # --------------------------------------------------------------------------
    print_separator("STEP 4: HOW CENTINEL FIN AI USES THIS")
    print("In your project:")
    print("1. Ingestion: Raw bank messages are hashed to detect duplicate messages.")
    print("2. Webhook Security: MessageDigest in Java uses SHA hashing to safely")
    print("   compare API keys without timing-attack vulnerabilities.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
