import os
import re

css_file = r'd:\ev-drive\frontend\src\index.css'

with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace variables in :root
root_pattern = re.compile(r':root\s*\{.*?\n\}', re.DOTALL)
new_root = """:root {
  /* ─── Dark theme palette ─── */
  --ink:            #f5f7f8;
  --ink-soft:       #c0cad4;

  --primary:        #FBCE0C; /* Primary Yellow */
  --primary-dark:   #DFD24F; /* Soft Yellow Glow */
  --primary-light:  rgba(251,206,12,0.15);
  --accent:         #01C5DE; /* Neon Cyan */
  --accent-soft:    rgba(1,197,222,0.15);

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
  --sidebar-bg:        rgba(7,21,23,0.85); /* Deep Background Black */
  --sidebar-border:    rgba(1,197,222,0.15);
  --sidebar-hover:     rgba(2,81,164,0.2); /* Royal Blue */
  --sidebar-text:      #8AA5B8; /* Lightened Muted Blue-Gray */
  --sidebar-text-dim:  #244E67; /* Muted Blue-Gray */
  --sidebar-active-bg: rgba(2,160,211,0.15); /* Bright Cyan */
  --sidebar-active-text: #01C5DE; /* Neon Cyan */
  --sidebar-width:     268px;

  /* ─── Surfaces ─── */
  --bg:             #071517; /* Deep Background Black */
  --bg-secondary:   #022D65; /* Dark Navy Blue */
  --card-bg:        rgba(2,45,101,0.4); /* Dark Navy Blue */
  --card-bg-solid:  #022D65;
  --surface:        rgba(2,81,164,0.2); /* Royal Blue */
  --glass:          rgba(2,160,211,0.05); /* Bright Cyan */
  --glass-border:   rgba(1,197,222,0.2); /* Neon Cyan */

  --text-primary:   #f5f7f8;
  --text-secondary: #8AA5B8;
  --text-muted:     #244E67;
  --border:         rgba(1,197,222,0.2);
  --border-light:   rgba(1,197,222,0.08);

  --shadow-xs:    0 1px 2px rgba(0,0,0,0.5);
  --shadow:       0 2px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md:    0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
  --shadow-lg:    0 20px 40px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4);
  --shadow-hover: 0 12px 28px rgba(2,160,211,0.2);
  --shadow-glow:  0 0 20px rgba(1,197,222,0.3);

  --radius:    10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}"""

content = root_pattern.sub(new_root, content)

# Replace the gradient on loading screen
content = re.sub(
    r'\.loading-screen \{[^}]*?background: linear-gradient[^}]*?\}',
    r'.loading-screen {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n  gap: 16px;\n  background: linear-gradient(135deg, #071517 0%, #022D65 50%, #0251A4 100%);\n}',
    content
)

# Replace the admin shell background
content = re.sub(
    r'\.admin-shell \{[^}]*?\}',
    r'.admin-shell {\n  display: flex;\n  height: 100vh;\n  overflow: hidden;\n  background: var(--bg);\n  background-image: radial-gradient(circle at 50% 50%, rgba(2, 160, 211, 0.2) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(1, 197, 222, 0.15) 0%, transparent 40%), radial-gradient(circle at 10% 20%, rgba(2, 45, 101, 0.4) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(0, 59, 135, 0.4) 0%, transparent 50%);\n}',
    content
)

# Fix old primary blue rgb values throughout the file
content = content.replace('108,140,255', '1,197,222') # Replace with Neon Cyan RGB
content = content.replace('#6c8cff', '#01C5DE')
content = content.replace('#5470e4', '#02A0D3')
content = content.replace('#4f6cdb', '#0377C4')

# Fix text colors where hardcoded
content = content.replace('#e4e7ed', 'var(--text-primary)')
content = content.replace('#8892a6', 'var(--text-secondary)')
content = content.replace('#505a6e', 'var(--text-muted)')

# Remove Emojis
content = re.sub(r'content:\s*[\'"][^\x00-\x7F]+[\'"];', "content: '';", content)
content = re.sub(r'[^\x00-\x7F]+', "", content) # Remove any remaining non-ascii (emojis)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("index.css updated successfully.")
