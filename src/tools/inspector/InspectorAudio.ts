import { TabPageApi } from "tweakpane";

/**
 * Manages the Audio Mixer pane in GadgetInspector.
 */
export class InspectorAudio {
  public static setupAudioFolder(audioTab: TabPageApi): void {
    const audioFolder = audioTab.addFolder({ title: "Audio Mixer", expanded: true });

    if (typeof document !== "undefined" && !document.getElementById("tp-custom-styles")) {
      const style = document.createElement("style");
      style.id = "tp-custom-styles";
      style.innerHTML = `
        .audio-mixer-row .tp-fldv_c {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: space-around;
          padding: 12px 4px;
        }
        .audio-mixer-row .tp-fldv_c > .tp-brkv {
          flex: 1 1 25%;
          margin-right: 8px;
          margin-bottom: 8px;
        }
        .audio-mixer-row .tp-fldv_c > .tp-brkv:nth-child(3n) {
          margin-right: 8px;
        }
        .audio-mixer-row .tp-fldv_c > .tp-brkv:last-child {
          margin-right: 0;
        }
        .audio-mixer-row .tp-lblv {
          flex-direction: column;
          align-items: center;
        }
        .audio-mixer-row .tp-lblv_l {
          padding-right: 0;
          text-align: center;
          width: 100%;
          margin-bottom: 8px;
          opacity: 0.8;
        }
        .audio-mixer-row .tp-lblv_v {
          width: 100%;
          display: flex;
          justify-content: center;
        }
      `;
      document.head.appendChild(style);
    }

    audioFolder.element.classList.add("audio-mixer-row");

    const audioSettings = {
      master: 1.0,
      music: 1.0,
      sfx: 1.0,
      reverb: 0.3,
    };

    audioFolder
      .addBinding(audioSettings, "master", {
        label: "Master",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:master", { detail: ev.value }));
      });

    audioFolder
      .addBinding(audioSettings, "music", {
        label: "Music",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:music", { detail: ev.value }));
      });

    audioFolder
      .addBinding(audioSettings, "sfx", {
        label: "SFX",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:sfx", { detail: ev.value }));
      });

    audioFolder
      .addBinding(audioSettings, "reverb", {
        label: "Reverb",
        min: 0,
        max: 1,
        step: 0.01,
        view: "cameraring",
      })
      .on("change", (ev: { value: number }) => {
        window.dispatchEvent(new CustomEvent("gadget:audio:reverb", { detail: ev.value }));
      });
  }
}
