// SoundEffects.js - Sound effects manager

class SoundEffects {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 1.0;
  }

  // Load a sound file
  loadSound(name, path, volume = 1.0) {
    this.sounds[name] = new Audio(path);
    this.sounds[name].volume = volume; // Set specific volume for this sound
    this.sounds[name].customVolume = volume; // Store the custom volume
  }

  // Play a sound
  play(name) {
    if (!this.enabled || !this.sounds[name]) return;

    // Clone the audio to allow overlapping plays
    const sound = this.sounds[name].cloneNode();
    // Use the custom volume if it exists, otherwise use global volume
    sound.volume = this.sounds[name].customVolume || this.volume;
    sound.play().catch((err) => console.log("Sound play failed:", err));
  }

  // Set global volume (0.0 to 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach((sound) => {
      sound.volume = this.volume;
    });
  }

  // Toggle sounds on/off
  toggle() {
    this.enabled = !this.enabled;
  }

  // Mute/unmute
  mute() {
    this.enabled = false;
  }

  unmute() {
    this.enabled = true;
  }
}

// Create and export a single instance
const soundEffects = new SoundEffects();

// Load your sounds here
soundEffects.loadSound("APF1", "sounds/SlideLong.mp3", 0.8);
soundEffects.loadSound("APF2", "sounds/SlideShort1.mp3", 0.6);
soundEffects.loadSound("APF3", "sounds/SlideShort2.mp3", 0.6);
soundEffects.loadSound("APFClose", "sounds/PaperRustle.mp3", 0.3);
soundEffects.loadSound("SCDopen", "sounds/CDopen.mp3");
soundEffects.loadSound("SCDclose", "sounds/CDclose.mp3", 0.3);
soundEffects.loadSound("SCDbpslide", "sounds/CDblueprintSlide.mp3", 0.3);
soundEffects.loadSound("NCpickup", "sounds/NewspaperPickup.mp3", 0.3);
soundEffects.loadSound("NCputdown", "sounds/NewspaperPutdown.mp3", 0.3);
soundEffects.loadSound("NCchange", "sounds/NewspaperChange.mp3", 0.1);

// Make it available globally
window.soundEffects = soundEffects;
