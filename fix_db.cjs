const admin = require("firebase-admin");

// Initialize with application default credentials or explicit config
// ProMed uses service account if available, but for script we can use the firebase-admin module and default application credentials from the CLI if logged in.
// Alternatively, let's just initialize using the web SDK but with email/pass if we can't use admin.
