using System;
using System.Security.Cryptography;
using System.Text;

namespace HRMS.Helpers
{
    public static class PasswordHelper
    {
        // CreatePasswordHash produces (hash, salt) in that order.
        // Hash: 32 bytes (HMACSHA256). Salt: 16 bytes (random).
        public static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            if (password == null) throw new ArgumentNullException(nameof(password));

            using var rng = RandomNumberGenerator.Create();
            passwordSalt = new byte[16];
            rng.GetBytes(passwordSalt);

            using var hmac = new HMACSHA256(passwordSalt);
            passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }

        // Verify expects (password, storedHash, storedSalt)
        public static bool VerifyPasswordHash(string password, byte[] storedHash, byte[] storedSalt)
        {
            if (password == null) throw new ArgumentNullException(nameof(password));
            if (storedHash == null || storedHash.Length == 0) throw new ArgumentException("Invalid stored hash", nameof(storedHash));
            if (storedSalt == null || storedSalt.Length == 0) throw new ArgumentException("Invalid stored salt", nameof(storedSalt));

            using var hmac = new HMACSHA256(storedSalt);
            var computed = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));

            if (computed.Length != storedHash.Length) return false;

            // constant time comparison
            var diff = 0;
            for (int i = 0; i < computed.Length; i++) diff |= computed[i] ^ storedHash[i];
            return diff == 0;
        }
    }
}
