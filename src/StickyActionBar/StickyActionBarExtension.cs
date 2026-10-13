using Cove.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Cove.StickyActionBar;

public sealed class StickyActionBarExtension : IExtension, IUIExtension
{
    public string Id => "io.github.jiwenjimiran.sticky-action-bar";
    public string Name => "Sticky Action Bar";
    public string Version => "1.0.0";
    public string? Description => "Keep list filters, titles, and selection actions visible while scrolling.";
    public string? Author => "jiwenji";
    public string? Url => "https://github.com/jiwenjimiran/sticky-action-bar";
    public string? IconUrl => null;
    public string? MinCoveVersion => "1.5.1";
    public IReadOnlyList<string> Categories => ["ui", "style"];
    public void ConfigureServices(IServiceCollection services, ExtensionContext context) { }
    public UIManifest GetUIManifest() => new();
}
