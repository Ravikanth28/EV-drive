import os
import re

css_file = r'd:\ev-drive\frontend\src\index.css'

with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace variables in :root
root_pattern = re.compile(r':root\s*\{.*?\n\}', re.DOTALL)
new_root = """:root {
  /* ─── Light theme palette ─── */
  --ink:            #071517; /* Deep Background Black */
  --ink-soft:       #022D65; /* Dark Navy Blue */

  --primary:        #0377C4; /* Highlight Blue */
  --primary-dark:   #0251A4; /* Royal Blue */
  --primary-light:  rgba(3,119,196,0.15);
  --accent:         #FBCE0C; /* Primary Yellow */
  --accent-soft:    rgba(251,206,12,0.15);

  --success:        #34d399;
  --success-light:  rgba(52,211,153,0.12);
  --warning:        #fb923c;
  --warning-light:  rgba(251,146,60,0.12);
  --danger:         #f87171;
  --danger-light:   rgba(248,113,113,0.12);
  --purple:         #a78bfa;
  --purple-light:   rgba(167,139,250,0.12);
  --cyan:           #02A0D3; /* Bright Cyan */
  --cyan-light:     rgba(2,160,211,0.10);

  /* ─── Sidebar ─── */
  --sidebar-bg:        #f5f7f8;
  --sidebar-border:    rgba(36,78,103,0.15);
  --sidebar-hover:     rgba(3,119,196,0.1);
  --sidebar-text:      #244E67; /* Muted Blue-Gray */
  --sidebar-text-dim:  rgba(36,78,103,0.7);
  --sidebar-active-bg: rgba(3,119,196,0.15);
  --sidebar-active-text: #0251A4; /* Royal Blue */
  --sidebar-width:     268px;

  /* ─── Surfaces ─── */
  --bg:             #f5f7f8; /* Light main background */
  --bg-secondary:   #ffffff;
  --card-bg:        rgba(255,255,255,0.85); /* Light glass */
  --card-bg-solid:  #ffffff;
  --surface:        #ffffff;
  --glass:          rgba(255,255,255,0.7);
  --glass-border:   rgba(36,78,103,0.15);

  --text-primary:   #071517; /* Deep Background Black */
  --text-secondary: #022D65; /* Dark Navy Blue */
  --text-muted:     #244E67; /* Muted Blue-Gray */
  --border:         rgba(36,78,103,0.2);
  --border-light:   rgba(36,78,103,0.1);

  --shadow-xs:    0 1px 2px rgba(7,21,23,0.05);
  --shadow:       0 2px 8px rgba(7,21,23,0.06), 0 1px 3px rgba(7,21,23,0.04);
  --shadow-md:    0 8px 24px rgba(7,21,23,0.08), 0 2px 8px rgba(7,21,23,0.04);
  --shadow-lg:    0 20px 40px rgba(7,21,23,0.12), 0 8px 16px rgba(7,21,23,0.08);
  --shadow-hover: 0 12px 28px rgba(3,119,196,0.15);
  --shadow-glow:  0 0 20px rgba(3,119,196,0.2);

  --radius:    10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}"""

content = root_pattern.sub(new_root, content)

# Update loading screen gradient
content = re.sub(
    r'\.loading-screen \{[^}]*?background: linear-gradient[^}]*?\}',
    r'.loading-screen {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n  gap: 16px;\n  background: linear-gradient(135deg, #f5f7f8 0%, #e0e6ed 100%);\n}',
    content
)

# Update admin-shell background gradient
content = re.sub(
    r'\.admin-shell \{[^}]*?\}',
    r'.admin-shell {\n  display: flex;\n  height: 100vh;\n  overflow: hidden;\n  background: var(--bg);\n  background-image: radial-gradient(circle at 50% 50%, rgba(251, 206, 12, 0.05) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(3, 119, 196, 0.03) 0%, transparent 40%), radial-gradient(circle at 10% 20%, rgba(1, 197, 222, 0.05) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(2, 160, 211, 0.05) 0%, transparent 50%);\n}',
    content
)

# Fix topbar
content = re.sub(r'\.topbar \{\s*background: rgba\(11,14,20,0\.85\);', r'.topbar {\n  background: rgba(255,255,255,0.85);', content)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("index.css updated to light theme.")
