// Pane Browser product defaults. User choices always override these defaults.

// Privacy: no telemetry, studies, sponsored content, or unsolicited startup calls.
pref("toolkit.telemetry.enabled", false);
pref("toolkit.telemetry.unified", false);
pref("toolkit.telemetry.archive.enabled", false);
pref("toolkit.telemetry.shutdownPingSender.enabled", false);
pref("toolkit.telemetry.newProfilePing.enabled", false);
pref("toolkit.telemetry.updatePing.enabled", false);
pref("datareporting.healthreport.uploadEnabled", false);
pref("datareporting.policy.dataSubmissionEnabled", false);
pref("app.shield.optoutstudies.enabled", false);
pref("browser.discovery.enabled", false);
pref("browser.ping-centre.telemetry", false);
pref("browser.newtabpage.activity-stream.telemetry", false);
pref("browser.newtabpage.activity-stream.feeds.telemetry", false);
pref("browser.newtabpage.activity-stream.showSponsored", false);
pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
pref("browser.newtabpage.activity-stream.discoverystream.enabled", false);
pref("browser.newtabpage.activity-stream.unifiedAds.tiles.enabled", false);
pref("browser.newtabpage.activity-stream.unifiedAds.spocs.enabled", false);
pref("browser.aboutConfig.showWarning", false);
pref("browser.urlbar.quicksuggest.enabled", false);
pref("browser.urlbar.suggest.quicksuggest.nonsponsored", false);
pref("browser.urlbar.suggest.quicksuggest.sponsored", false);
pref("browser.urlbar.suggest.trending", false);
pref("browser.urlbar.suggest.weather", false);
pref("browser.search.suggest.enabled.private", false);
pref("network.captive-portal-service.enabled", false);
pref("network.connectivity-service.enabled", false);
pref("dom.security.https_only_mode", true);
pref("privacy.donottrackheader.enabled", true);
pref("privacy.globalprivacycontrol.enabled", true);
pref("network.cookie.cookieBehavior", 5);
pref("privacy.partition.network_state", true);
pref("privacy.trackingprotection.enabled", true);
pref("privacy.trackingprotection.socialtracking.enabled", true);
pref("privacy.trackingprotection.cryptomining.enabled", true);
pref("privacy.trackingprotection.fingerprinting.enabled", true);
pref("signon.rememberSignons", true);
pref("signon.generation.enabled", true);
pref("signon.management.page.breach-alerts.enabled", true);

// Install signed extensions shipped in Pane.app/distribution on first profile use.
pref("extensions.installDistroAddons", true);
pref("extensions.autoDisableScopes", 0);
pref("extensions.enabledScopes", 15);

// Optional services remain inactive until the user explicitly enables them.
pref("identity.fxaccounts.enabled", true);
pref("browser.safebrowsing.malware.enabled", false);
pref("browser.safebrowsing.phishing.enabled", false);
pref("browser.safebrowsing.downloads.enabled", false);
pref("browser.translations.enable", false);

// Built-in Gecko capabilities retained and surfaced.
pref("browser.profiles.enabled", true);
pref("browser.tabs.groups.enabled", true);
pref("browser.tabs.splitView.enabled", true);
pref("sidebar.revamp", true);
pref("sidebar.verticalTabs", false);
pref("sidebar.position_start", true);
pref("screenshots.browser.component.enabled", true);
pref("media.videocontrols.picture-in-picture.enabled", true);
pref("media.videocontrols.picture-in-picture.video-toggle.enabled", true);
pref("reader.parse-on-load.enabled", true);
pref("devtools.policy.disabled", false);
pref("devtools.chrome.enabled", true);
pref("devtools.debugger.remote-enabled", false);

// Pane appearance model. The shell extension owns the matching WebUI values.
pref("pane.tabs.position", "single");
pref("pane.tabs.side", "left");
pref("pane.tabs.width", 248);
pref("pane.tabs.floating", false);
pref("pane.appearance.radius", 10);
pref("pane.appearance.blur", 18);
pref("pane.appearance.font", "SF Pro Text");
pref("pane.appearance.animation", "minimal");
pref("pane.appearance.mode", "system");
pref("pane.appearance.accent", "#3B6FF5");
pref("pane.appearance.background", "#15171C");
pref("pane.appearance.surface", "#20232A");
pref("pane.appearance.text", "#F2F4F8");
pref("pane.newtab.mode", "dashboard");

// Keep the complete native migration wizard, including browser data imports.
pref("browser.migrate.content-modal.enabled", true);
pref("browser.migrate.preferences-entrypoint.enabled", true);
pref("browser.migrate.chrome.history.limit", 0);
pref("browser.migrate.chrome.bookmarks.limit", 0);
