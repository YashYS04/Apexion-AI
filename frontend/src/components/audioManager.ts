/**
 * F1 Team Radio Audio Manager
 * Synthesizes walkie-talkie "chirps", radio static bursts, and robot-toned SpeechSynthesis
 * to simulate professional pit-to-car radio transmissions.
 */

class TeamRadioManager {
  private audioCtx: AudioContext | null = null;

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  /**
   * Plays the classic high-pitch "radio beep-chirp" before transmissions.
   */
  public playChirp(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.initAudio();
        if (!this.audioCtx) return resolve();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        // F1 radio beep pattern: two short beeps
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.setValueAtTime(0.12, now + 0.08);
        gain.gain.linearRampToValueAtTime(0.0, now + 0.10);

        osc.frequency.setValueAtTime(1000, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.14);
        gain.gain.setValueAtTime(0.12, now + 0.20);
        gain.gain.linearRampToValueAtTime(0.0, now + 0.22);

        osc.start(now);
        osc.stop(now + 0.25);

        setTimeout(resolve, 250);
      } catch (err) {
        console.error("Failed to play radio chirp:", err);
        resolve();
      }
    });
  }

  /**
   * Plays a walkie-talkie "white noise static burst" after transmissions.
   */
  public playStatic(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.initAudio();
        if (!this.audioCtx) return resolve();

        const bufferSize = this.audioCtx.sampleRate * 0.15; // 150ms of static
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill buffer with white noise
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        // Bandpass filter to make it sound like walkie-talkie speaker static
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1000;
        filter.Q.value = 1.5;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.14);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        noiseNode.start();
        setTimeout(resolve, 150);
      } catch (err) {
        console.error("Failed to play radio static:", err);
        resolve();
      }
    });
  }

  /**
   * Speaks the message in a radio-filtered synthetic voice.
   */
  public speak(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return resolve();
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      // Play start chirp
      await this.playChirp();

      // Shorten the message if it's too long for standard team radio (remove references/urls)
      let cleanedText = text
        .replace(/https?:\/\/[^\s]+/g, "") // remove URLs
        .replace(/Article\s+\d+(\.\d+)*/gi, "regulations") // simplify FIA article numbers
        .substring(0, 200); // limit length

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      
      // Attempt to pick a generic male English voice for the "Race Engineer" feel
      const voices = window.speechSynthesis.getVoices();
      const engMaleVoice = voices.find(
        (v) => (v.lang.startsWith("en-") || v.lang.startsWith("en_")) && 
               (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("google us english"))
      );
      if (engMaleVoice) {
        utterance.voice = engMaleVoice;
      }

      utterance.pitch = 0.85; // slightly lower pitch
      utterance.rate = 0.95;  // slightly slower pace

      utterance.onend = async () => {
        await this.playStatic();
        resolve();
      };

      utterance.onerror = async () => {
        await this.playStatic();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const audioManager = new TeamRadioManager();
