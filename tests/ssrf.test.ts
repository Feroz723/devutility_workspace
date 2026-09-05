import { describe, it, expect } from "vitest";
import { validatePublicUrl } from "@/lib/ssrf";

describe("Security — SSRF Protection", () => {
  it("blocks localhost and loopback addresses", () => {
    expect(validatePublicUrl("http://localhost/api").safe).toBe(false);
    expect(validatePublicUrl("http://127.0.0.1:8080/admin").safe).toBe(false);
    expect(validatePublicUrl("http://0.0.0.0").safe).toBe(false);
    expect(validatePublicUrl("http://[::1]/secret").safe).toBe(false);
  });

  it("blocks cloud metadata services (AWS/GCP/Azure link-local)", () => {
    expect(validatePublicUrl("http://169.254.169.254/latest/meta-data/").safe).toBe(false);
    expect(validatePublicUrl("http://metadata.google.internal/computeMetadata/v1/").safe).toBe(false);
  });

  it("blocks private network IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", () => {
    expect(validatePublicUrl("http://10.0.0.15/dashboard").safe).toBe(false);
    expect(validatePublicUrl("http://172.20.10.5/internal").safe).toBe(false);
    expect(validatePublicUrl("http://192.168.1.1/router").safe).toBe(false);
  });

  it("blocks internal domain extensions", () => {
    expect(validatePublicUrl("http://service.local/api").safe).toBe(false);
    expect(validatePublicUrl("http://database.internal/query").safe).toBe(false);
    expect(validatePublicUrl("http://vault.corp/keys").safe).toBe(false);
  });

  it("blocks disallowed protocols (file://, ftp://, gopher://)", () => {
    expect(validatePublicUrl("file:///etc/passwd").safe).toBe(false);
    expect(validatePublicUrl("ftp://files.example.com").safe).toBe(false);
    expect(validatePublicUrl("gopher://example.com").safe).toBe(false);
  });

  it("permits public HTTP and HTTPS endpoints", () => {
    expect(validatePublicUrl("https://news.ycombinator.com").safe).toBe(true);
    expect(validatePublicUrl("https://api.github.com/repos/test/test").safe).toBe(true);
    expect(validatePublicUrl("https://www.reddit.com/r/smallbusiness").safe).toBe(true);
    expect(validatePublicUrl("http://example.com/blog/post-1").safe).toBe(true);
  });
});
