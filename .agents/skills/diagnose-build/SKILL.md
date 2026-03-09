# Create .Codex/skills/diagnose-build/SKILL.md with:

## Diagnose Build Failures
1. Run the build command and capture ALL errors
2. Categorize errors: missing assets, invalid config, env var issues, code signing
3. Fix in dependency order (assets first, then config, then env, then signing)
4. Re-run build after EACH fix to check for new cascading errors
5. Only report success after a clean build

# Then just type: /diagnose-build
