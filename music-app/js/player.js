/* =========================================================
   player.js
   Audio engine built on the HTML5 <audio> element.
   Owns the queue, shuffle, repeat, seeking and volume, and
   reports changes through DOM events so the UI stays separate:

     trackchange  – a new song was loaded
     statechange  – play / pause / shuffle / repeat changed
     timeupdate   – playback position moved
     durationchange
     queuechange  – queue contents or position changed
     volumechange
     playing      – audio actually started producing sound
     buffering    – detail.buffering true/false
     error        – the current track failed to load
     blocked      – the browser refused autoplay

   Exposed as window.MusicPlayer
   ========================================================= */
(function () {
  'use strict';

  const REPEAT_MODES = ['off', 'all', 'one'];

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  class MusicPlayer extends EventTarget {
    /**
     * @param {HTMLAudioElement} audio
     * @param {(id:number) => object|null} resolveSong
     */
    constructor(audio, resolveSong) {
      super();
      this.audio = audio;
      this.resolve = resolveSong;
      this.queue = [];      // song ids in play order
      this.original = [];   // unshuffled order, used when shuffle is turned off
      this.index = -1;
      this.shuffle = false;
      this.repeat = 'off';
      this.sourceKey = null; // e.g. "album:city-pulse" – lets the UI mark what is playing
      this.wantsPlay = false;
      this._pendingSeek = null;

      audio.preload = 'metadata';
      const on = (type, fn) => audio.addEventListener(type, fn);
      on('play', () => this._emit('statechange'));
      on('pause', () => this._emit('statechange'));
      on('playing', () => { this._emit('playing'); this._emit('buffering', { buffering: false }); });
      on('waiting', () => this._emit('buffering', { buffering: true }));
      on('canplay', () => this._emit('buffering', { buffering: false }));
      on('timeupdate', () => this._emit('timeupdate'));
      on('durationchange', () => this._emit('durationchange'));
      on('volumechange', () => this._emit('volumechange'));
      on('ended', () => this._onEnded());
      on('loadedmetadata', () => {
        if (this._pendingSeek != null && Number.isFinite(audio.duration)) {
          try { audio.currentTime = clamp(this._pendingSeek, 0, audio.duration - 1); } catch (e) { /* ignore */ }
        }
        this._pendingSeek = null;
        this._emit('durationchange');
        this._emit('timeupdate');
      });
      on('error', () => {
        if (!audio.getAttribute('src')) return;
        this._emit('buffering', { buffering: false });
        this._emit('error', { song: this.current });
      });

      this._setupMediaSession();
    }

    /* ---------- getters ---------- */
    get current() { return this.index >= 0 ? this.resolve(this.queue[this.index]) || null : null; }
    get isPlaying() { return !this.audio.paused && !this.audio.ended; }
    get currentTime() { return this.audio.currentTime || 0; }
    get duration() {
      const d = this.audio.duration;
      if (Number.isFinite(d) && d > 0) return d;
      return this.current ? this.current.duration : 0;
    }
    get volume() { return this.audio.volume; }
    get muted() { return this.audio.muted || this.audio.volume === 0; }
    get upcoming() { return this.queue.slice(this.index + 1); }

    _emit(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /* ---------- queue ---------- */
    setQueue(ids, startIndex = 0, { autoplay = true, source = null } = {}) {
      ids = ids.filter(id => this.resolve(id));
      if (!ids.length) return;
      startIndex = clamp(startIndex, 0, ids.length - 1);
      this.sourceKey = source;
      this.original = ids.slice();
      if (this.shuffle) {
        const rest = ids.slice();
        const [first] = rest.splice(startIndex, 1);
        this.queue = [first, ...shuffled(rest)];
        this.index = 0;
      } else {
        this.queue = ids.slice();
        this.index = startIndex;
      }
      this._emit('queuechange');
      this._load(autoplay);
    }

    playAt(index) {
      if (index < 0 || index >= this.queue.length) return;
      this.index = index;
      this._emit('queuechange');
      this._load(true);
    }

    addToQueue(ids) {
      ids = ids.filter(id => this.resolve(id));
      if (!ids.length) return;
      if (!this.queue.length) { this.setQueue(ids, 0, { autoplay: false }); return; }
      this.queue.push(...ids);
      this.original.push(...ids);
      this._emit('queuechange');
    }

    playNext(ids) {
      ids = ids.filter(id => this.resolve(id));
      if (!ids.length) return;
      if (!this.queue.length) { this.setQueue(ids, 0, { autoplay: true }); return; }
      this.queue.splice(this.index + 1, 0, ...ids);
      const oi = this.original.indexOf(this.queue[this.index]);
      this.original.splice(oi + 1, 0, ...ids);
      this._emit('queuechange');
    }

    removeAt(index) {
      if (index === this.index || index < 0 || index >= this.queue.length) return;
      const [id] = this.queue.splice(index, 1);
      if (index < this.index) this.index--;
      const oi = this.original.lastIndexOf(id);
      if (oi > -1) this.original.splice(oi, 1);
      this._emit('queuechange');
    }

    clearUpcoming() {
      const removed = this.queue.splice(this.index + 1);
      removed.forEach(id => {
        const oi = this.original.lastIndexOf(id);
        if (oi > -1) this.original.splice(oi, 1);
      });
      this._emit('queuechange');
    }

    /* ---------- transport ---------- */
    _load(autoplay, position = null) {
      const song = this.current;
      if (!song) return;
      this._pendingSeek = position;
      this.audio.src = song.audio;
      this._updateMediaSession(song);
      this._emit('trackchange', { song });
      if (autoplay) this.play();
      else { this.wantsPlay = false; this._emit('statechange'); }
    }

    play() {
      if (!this.current) return;
      this.wantsPlay = true;
      const p = this.audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => {
          if (err && err.name === 'NotAllowedError') {
            this.wantsPlay = false;
            this._emit('blocked');
          }
          // AbortError (src changed mid-load) and source errors are handled elsewhere
        });
      }
    }

    pause() {
      this.wantsPlay = false;
      this.audio.pause();
    }

    toggle() {
      if (!this.current) return;
      if (this.audio.paused) this.play();
      else this.pause();
    }

    next() {
      if (!this.queue.length) return;
      this.index = this.index < this.queue.length - 1 ? this.index + 1 : 0;
      this._emit('queuechange');
      this._load(true);
    }

    prev() {
      if (!this.queue.length) return;
      if (this.audio.currentTime > 3) { this.seekTo(0); return; }
      if (this.index > 0) this.index--;
      else if (this.repeat === 'all') this.index = this.queue.length - 1;
      else { this.seekTo(0); return; }
      this._emit('queuechange');
      this._load(true);
    }

    _onEnded() {
      if (this.repeat === 'one') {
        this.audio.currentTime = 0;
        this.play();
        return;
      }
      if (this.index < this.queue.length - 1 || this.repeat === 'all') {
        this.next();
        return;
      }
      // End of the queue: stay on the last track, rewound and paused.
      this.wantsPlay = false;
      this.audio.currentTime = 0;
      this._emit('statechange');
      this._emit('queueend');
    }

    seekRatio(ratio) {
      const d = this.duration;
      if (d) this.seekTo(ratio * d);
    }

    seekTo(sec) {
      if (!this.current) return;
      const d = this.audio.duration;
      if (!Number.isFinite(d)) { this._pendingSeek = sec; return; }
      this.audio.currentTime = clamp(sec, 0, Math.max(0, d - 0.25));
      this._emit('timeupdate');
    }

    seekBy(delta) { this.seekTo(this.currentTime + delta); }

    /* ---------- volume ---------- */
    setVolume(v) {
      v = clamp(v, 0, 1);
      this.audio.volume = v;
      if (v > 0 && this.audio.muted) this.audio.muted = false;
    }

    toggleMute() {
      if (this.muted) {
        this.audio.muted = false;
        if (this.audio.volume === 0) this.audio.volume = 0.6;
      } else {
        this.audio.muted = true;
      }
    }

    /* ---------- modes ---------- */
    toggleShuffle() { this.setShuffle(!this.shuffle); }

    setShuffle(on) {
      if (on === this.shuffle) return;
      this.shuffle = on;
      const curId = this.queue[this.index];
      if (this.queue.length && this.index >= 0) {
        if (on) {
          this.original = this.queue.slice();
          const rest = this.queue.slice();
          rest.splice(this.index, 1);
          this.queue = [curId, ...shuffled(rest)];
          this.index = 0;
        } else {
          const i = this.original.indexOf(curId);
          this.queue = this.original.slice();
          this.index = i >= 0 ? i : 0;
        }
        this._emit('queuechange');
      }
      this._emit('statechange');
    }

    cycleRepeat() {
      const i = REPEAT_MODES.indexOf(this.repeat);
      this.repeat = REPEAT_MODES[(i + 1) % REPEAT_MODES.length];
      this._emit('statechange');
    }

    /* ---------- persistence ---------- */
    serialize() {
      return {
        queue: this.queue,
        original: this.original,
        index: this.index,
        shuffle: this.shuffle,
        repeat: this.repeat,
        sourceKey: this.sourceKey,
        volume: this.audio.volume,
        muted: this.audio.muted,
        position: Math.floor(this.currentTime),
      };
    }

    restore(saved) {
      if (!saved || typeof saved !== 'object') return false;
      if (typeof saved.volume === 'number') this.audio.volume = clamp(saved.volume, 0, 1);
      this.audio.muted = !!saved.muted;
      this.shuffle = !!saved.shuffle;
      this.repeat = REPEAT_MODES.includes(saved.repeat) ? saved.repeat : 'off';
      const valid = id => !!this.resolve(id);
      const queue = Array.isArray(saved.queue) ? saved.queue.filter(valid) : [];
      if (!queue.length) { this._emit('volumechange'); return false; }
      this.queue = queue;
      const original = Array.isArray(saved.original) ? saved.original.filter(valid) : [];
      this.original = original.length ? original : queue.slice();
      this.index = clamp(saved.index | 0, 0, queue.length - 1);
      this.sourceKey = saved.sourceKey || null;
      this._emit('queuechange');
      this._load(false, saved.position > 0 ? saved.position : null);
      this._emit('volumechange');
      return true;
    }

    /* ---------- OS media controls ---------- */
    _setupMediaSession() {
      if (!('mediaSession' in navigator)) return;
      const set = (action, handler) => {
        try { navigator.mediaSession.setActionHandler(action, handler); } catch (e) { /* unsupported */ }
      };
      set('play', () => this.play());
      set('pause', () => this.pause());
      set('previoustrack', () => this.prev());
      set('nexttrack', () => this.next());
      set('seekto', d => { if (d && d.seekTime != null) this.seekTo(d.seekTime); });
    }

    _updateMediaSession(song) {
      if (!('mediaSession' in navigator) || typeof window.MediaMetadata === 'undefined') return;
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album,
          artwork: [{ src: song.cover, sizes: '400x400', type: 'image/svg+xml' }],
        });
      } catch (e) { /* ignore */ }
    }
  }

  window.MusicPlayer = MusicPlayer;
})();
