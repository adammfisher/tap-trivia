// Eagerly resolve the __ExpoImportMetaRegistry lazy getter to prevent
// "import outside of scope" errors when Jest tears down the environment.
// This fires the getter now, during setup, while the env is still active.
if (typeof globalThis.__ExpoImportMetaRegistry !== 'undefined') {
  // Touch the property to trigger lazy initialization
  void globalThis.__ExpoImportMetaRegistry;
}
