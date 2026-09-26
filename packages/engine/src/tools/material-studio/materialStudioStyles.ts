export const MATERIAL_STUDIO_CSS = `
      .swf-ms-container {
        --bg-dark: #0f111a;
        --bg-panel: rgba(22, 28, 45, 0.7);
        --bg-control: #1a1f35;
        --accent: #3b82f6;
        --accent-glow: rgba(59, 130, 246, 0.3);
        --accent-green: #10b981;
        --accent-green-glow: rgba(16, 185, 129, 0.2);
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --border: rgba(148, 163, 184, 0.1);
        --border-focus: rgba(59, 130, 246, 0.5);

        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        background: var(--bg-dark);
        color: var(--text-main);
        font-family: "Outfit", system-ui, sans-serif;
        box-sizing: border-box;
      }

      .swf-ms-container *,
      .swf-ms-container *::before,
      .swf-ms-container *::after {
        box-sizing: border-box;
      }

      /* Custom Scrollbar */
      .swf-ms-container ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .swf-ms-container ::-webkit-scrollbar-track {
        background: var(--bg-dark);
      }
      .swf-ms-container ::-webkit-scrollbar-thumb {
        background: var(--bg-control);
        border-radius: 4px;
      }
      .swf-ms-container ::-webkit-scrollbar-thumb:hover {
        background: var(--accent);
      }

      .badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: var(--accent-glow);
        border: 1px solid var(--accent);
        border-radius: 9999px;
        color: #93c5fd;
        font-weight: 500;
      }

      .app-container {
        display: flex;
        flex: 1;
        height: 100%;
        position: relative;
      }

      /* Sidebar controls */
      .sidebar {
        width: 380px;
        background: var(--bg-panel);
        backdrop-filter: blur(20px);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        height: 100%;
        z-index: 5;
      }

      .sidebar-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }

      .section-title {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        padding-bottom: 0.5rem;
      }

      .control-group {
        margin-bottom: 1.5rem;
        background: rgba(26, 31, 53, 0.3);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.1rem;
        transition: all 0.3s ease;
      }

      .control-group:hover {
        border-color: rgba(148, 163, 184, 0.15);
      }

      .control-row {
        margin-bottom: 1rem;
      }

      .control-row:last-child {
        margin-bottom: 0;
      }

      label {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }

      .value-display {
        color: var(--accent);
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        font-weight: 600;
      }

      select,
      input[type="text"] {
        width: 100%;
        background: var(--bg-control);
        border: 1px solid var(--border);
        color: var(--text-main);
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        font-family: inherit;
        font-size: 0.85rem;
        outline: none;
        transition: all 0.2s ease;
      }

      select:focus,
      input[type="text"]:focus {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 2px var(--accent-glow);
      }

      /* Range slider custom styling */
      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: var(--bg-control);
        outline: none;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--accent);
        cursor: pointer;
        transition:
          transform 0.1s ease,
          background-color 0.1s ease;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: #60a5fa;
      }

      /* Toggle switch styling */
      .switch-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.2rem 0;
      }

      .switch-row label {
        margin-bottom: 0;
        cursor: pointer;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-control);
        transition: 0.3s;
        border-radius: 20px;
        border: 1px solid var(--border);
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background-color: var(--text-muted);
        transition: 0.3s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: var(--accent);
        border-color: var(--accent);
      }

      input:checked + .slider:before {
        transform: translateX(18px);
        background-color: var(--text-main);
      }

      /* Dropzone */
      .dropzone {
        border: 2px dashed var(--border);
        border-radius: 12px;
        padding: 1.5rem 1rem;
        text-align: center;
        cursor: pointer;
        background: rgba(26, 31, 53, 0.2);
        transition: all 0.3s ease;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .dropzone:hover,
      .dropzone.dragover {
        border-color: var(--accent);
        background: rgba(59, 130, 246, 0.05);
      }

      .dropzone-icon {
        color: var(--accent);
        transition: transform 0.3s ease;
      }

      .dropzone:hover .dropzone-icon {
        transform: translateY(-3px);
      }

      .dropzone-text {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-muted);
      }

      .dropzone-sub {
        font-size: 0.7rem;
        color: rgba(148, 163, 184, 0.6);
      }

      /* Sidebar action buttons */
      .sidebar-actions {
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--border);
        background: rgba(15, 17, 26, 0.4);
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        outline: none;
      }

      .btn-primary {
        background: var(--accent);
        color: var(--text-main);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
      }

      .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
      }

      .btn-secondary {
        background: var(--bg-control);
        color: var(--text-main);
        border: 1px solid var(--border);
      }

      .btn-secondary:hover {
        background: #232a48;
        border-color: rgba(148, 163, 184, 0.3);
      }

      .btn-secondary.active {
        border-color: var(--accent);
        background: var(--accent-glow);
        color: var(--text-main);
      }

      /* Main Viewport & Tabs */
      .viewport {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #090a0f;
        overflow: hidden;
        position: relative;
      }

      .tabs-bar {
        display: flex;
        padding: 0.75rem 1.5rem 0 1.5rem;
        background: rgba(15, 17, 26, 0.5);
        border-bottom: 1px solid var(--border);
        gap: 0.25rem;
        overflow-x: auto;
      }

      .tab {
        padding: 0.6rem 1rem;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        border-radius: 8px 8px 0 0;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
      }

      .tab:hover {
        color: var(--text-main);
        background: rgba(255, 255, 255, 0.02);
      }

      .tab.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
        background: rgba(59, 130, 246, 0.05);
        font-weight: 600;
      }

      .canvas-container {
        flex: 1;
        padding: 2.5rem 1.5rem 1.5rem 1.5rem;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        overflow: auto;
        position: relative;
      }

      .checkerboard {
        background-image:
          linear-gradient(45deg, #181b28 25%, transparent 25%),
          linear-gradient(-45deg, #181b28 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #181b28 75%),
          linear-gradient(-45deg, transparent 75%, #181b28 75%);
        background-size: 20px 20px;
        background-position:
          0 0,
          0 10px,
          10px -10px,
          -10px 0px;
        background-color: #10121a;
        border-radius: 12px;
        border: 1px solid var(--border);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        max-height: 100%;
        padding: 10px;
        transition: all 0.3s ease;
      }

      .swf-ms-content canvas {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        border-radius: 6px;
        display: block;
      }

      /* Grid View */
      .grid-view {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        width: 100%;
        height: 100%;
        padding: 0.5rem;
        overflow-y: auto;
      }

      .grid-item {
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        position: relative;
      }

      .grid-item-title {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        align-self: flex-start;
        display: flex;
        justify-content: space-between;
        width: 100%;
        align-items: center;
        border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        padding-bottom: 0.4rem;
      }

      .grid-item-download {
        cursor: pointer;
        color: var(--accent);
        transition: color 0.2s ease;
        display: flex;
        align-items: center;
      }

      .grid-item-download:hover {
        color: #60a5fa;
      }

      .grid-item .checkerboard {
        width: 100%;
        aspect-ratio: 1;
        padding: 6px;
      }

      .grid-item canvas {
        width: 100%;
        height: 100%;
        max-height: 100%;
      }

      /* Tooltip/overlay loading indicator */
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(9, 10, 15, 0.85);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(5px);
      }

      .loading-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(59, 130, 246, 0.1);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 1s infinite linear;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .hidden {
        display: none !important;
      }

      .tab-content-hidden {
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }

      /* Expandable sections */
      .collapsible-header {
        background: rgba(26, 31, 53, 0.5);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
        font-weight: 600;
        transition: all 0.2s ease;
      }

      .collapsible-header:hover {
        border-color: rgba(148, 163, 184, 0.2);
        background: rgba(26, 31, 53, 0.7);
      }

      .collapsible-header svg {
        transition: transform 0.2s ease;
      }

      .collapsible-header.active svg {
        transform: rotate(90deg);
      }

      .collapsible-content {
        max-height: 0;
        overflow: hidden;
        transition:
          max-height 0.3s ease-out,
          padding 0.3s ease;
        padding: 0 0.5rem;
      }

      .collapsible-content.open {
        max-height: 1000px;
        padding: 0.75rem 0.5rem 1.25rem 0.5rem;
      }
    `;
