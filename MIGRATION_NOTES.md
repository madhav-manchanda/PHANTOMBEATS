# PhantomBeats Frontend Migration Notes

## 1. API Services (`services/api.js`)
- `searchSongs(query)`: Takes a string query, returns `data.results` (Array of songs). Used for Search screen.
- `getSong(id)`: Takes song ID, returns `data.data` (Song object).
- `getSongLyrics(id)`: Takes song ID, returns lyrics data. Used for Lyrics view.
- `getStreamUrl(id, quality)`: Returns stream URL string. Used by Player engine.
- `getAlbum(query)`: Takes album query, returns album data.
- `getPlaylist(query)`: Takes playlist query, returns playlist data.
- `getTrending()`: Returns trending data (Array of songs/playlists), cached for 5 mins. Used for Home screen sections like "Made For This Moment" or "Your Rotation".

## 2. Auth & Storage (`services/supabaseClient.js`, `services/storage.js`)
- `getSession()` / `getUser()`: Fetch current logged-in user.
- `onAuthChange(callback)`: Listens to auth state changes.
- `saveUserData(userId, key, data)` / `loadUserData(userId, key)`: Used for saving/loading user preferences or states (e.g., liked songs).
- `updateUserProfile(userId, profile)` / `getUserProfile(userId)`: User profile management.
- `storage.js`: Handles `localStorage` for volume, recently played songs (`addToRecentlyPlayed`), crossfade duration, and phantom stats history.

## 3. Player Engine (`services/playerEngine.js`)
- **State Management**: `player` instance holds `queue`, `currentIndex`, `isPlaying`, `shuffle`, `repeat`, `audio` element, `inactiveAudio` (crossfade), `sleepTimeRemaining`, `bassFilter`.
- **Events (via `on(event, cb)`)**: `timeupdate` (currentTime, duration), `statechange` (isPlaying), `loaded` (duration), `songchange` (song, queue, index), `volumechange`, `shufflechange`, `repeatchange`, `queuechange`, `phantomchange`, `sleepupdate`, `sleeptimer`.
- **Methods**: 
  - `playSong(song, clearQueue)` / `playSongList(songs, startIndex)`
  - `togglePlay()`, `next()`, `prev()`, `toggleRepeat()`, `toggleShuffle()`
  - `seek(percentage)` (0.0 to 1.0)
  - `setVolume(vol)`
  - `setPhantomMode(speed, bass, pitch)`
  - `startSleepTimer(minutes)` / `cancelSleepTimer()`
  - `addToQueue(song)` / `removeFromQueue(index)` / `clearQueue()`

## 4. UI Layer Contract
- The new UI (HTML/JS/CSS) must use these exact services. 
- For instance, the new `ProgressSlider` must listen to `player.on('timeupdate')` and call `player.seek(percentage)`.
- The `ImmersivePlayerSheet` transport controls must call `player.togglePlay()`, `player.next()`, etc.
- The new Desktop Home and Mobile Home screens must fetch data using `getTrending()` and auth data using `getUser()`.
- "Recently Played" should use `storage` (e.g. `localStorage.getItem('phantom_stats_history')` or similar custom logic in `storage.js`).
