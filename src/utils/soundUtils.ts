// Simple sound helper for bridge add click
export const playBridgeClick = (times: number = 1) => {
  const count = Math.max(0, Math.floor(times));
  for (let i = 0; i < count; i++) {
    // Stagger slightly if multiple plays are needed
    setTimeout(() => {
      try {
        const audio = new Audio('/clickSound.mp3');
        audio.volume = 0.7;
        // Some browsers require user interaction before audio; ignore errors
        void audio.play();
      } catch (_) {
        // noop
      }
    }, i * 60);
  }
};

// Simple sound helper for bridge removal
export const playBridgeDelete = (times: number = 1) => {
  const count = Math.max(0, Math.floor(times));
  for (let i = 0; i < count; i++) {
    // Stagger slightly if multiple plays are needed
    setTimeout(() => {
      try {
        const audio = new Audio('/deleteKeySound.mp3');
        audio.volume = 0.1;
        // Some browsers require user interaction before audio; ignore errors
        void audio.play();
      } catch (_) {
        // noop
      }
    }, i * 60);
  }
};
