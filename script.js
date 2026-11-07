const gamesStorageKey = "hub44ty.games";
const games = [];
let gameStorageError = "";

const loginView = document.getElementById("login-view");
const libraryView = document.getElementById("library-view");
const loginForm = document.getElementById("login-form");
const accountBar = document.getElementById("account-bar");
const gameList = document.getElementById("game-list");
const emptyLibrary = document.getElementById("empty-library");
const gameCount = document.getElementById("game-count");
const credentialStatus = document.getElementById("credential-status");
const addGameButton = document.getElementById("add-game-button");
const addGameForm = document.getElementById("add-game-form");
const gameFormStatus = document.getElementById("game-form-status");

document.getElementById("year").textContent = new Date().getFullYear();

function normalizeGameUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function loadGames() {
  try {
    const storedGames = window.localStorage.getItem(gamesStorageKey);
    if (!storedGames) return;

    const parsedGames = JSON.parse(storedGames);
    if (!Array.isArray(parsedGames)) {
      throw new TypeError("Saved game list must be an array.");
    }

    parsedGames.forEach((game) => {
      if (
        game &&
        typeof game.name === "string" &&
        game.name.trim() &&
        typeof game.url === "string"
      ) {
        const url = normalizeGameUrl(game.url);
        if (url) games.push({ name: game.name.trim(), url });
      }
    });
  } catch (error) {
    console.error("Could not load the saved game library.", error);
    gameStorageError = "Δεν ήταν δυνατή η φόρτωση της βιβλιοθήκης από τον browser.";
  }
}

function saveGames(nextGames) {
  try {
    window.localStorage.setItem(gamesStorageKey, JSON.stringify(nextGames));
    return true;
  } catch (error) {
    console.error("Could not save the game library.", error);
    gameFormStatus.textContent = "Δεν ήταν δυνατή η αποθήκευση στον browser.";
    return false;
  }
}

function setAddGameFormVisible(visible) {
  addGameForm.hidden = !visible;
  addGameButton.setAttribute("aria-expanded", String(visible));
  if (visible) {
    gameFormStatus.textContent = gameStorageError;
    document.getElementById("game-name").focus();
  }
}

function showLibrary(username) {
  loginView.hidden = true;
  libraryView.hidden = false;
  accountBar.hidden = false;
  document.getElementById("welcome-user").textContent = username;
  renderGames();
}

function renderGames() {
  gameCount.textContent = String(games.length);
  gameList.replaceChildren();
  emptyLibrary.hidden = games.length > 0;

  games.forEach((game) => {
    const card = document.createElement("article");
    card.className = "game-card";

    const top = document.createElement("div");
    top.className = "game-card-top";

    const art = document.createElement("span");
    art.className = "game-art";
    art.setAttribute("aria-hidden", "true");
    art.textContent = "✦";

    const titleGroup = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = game.name;
    const description = document.createElement("p");
    description.textContent = "Το παιχνίδι σου";
    titleGroup.append(title, description);
    top.append(art, titleGroup);
    card.append(top);

    const link = document.createElement("a");
    link.className = "game-link";
    link.href = game.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Παίξε τώρα ↗";
    card.append(link);

    gameList.append(card);
  });
}

loadGames();

addGameButton.addEventListener("click", () => {
  setAddGameFormVisible(addGameForm.hidden);
});

document.getElementById("cancel-add-game").addEventListener("click", () => {
  addGameForm.reset();
  gameFormStatus.textContent = "";
  setAddGameFormVisible(false);
});

addGameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (gameStorageError) {
    gameFormStatus.textContent = gameStorageError;
    return;
  }

  const formData = new FormData(addGameForm);
  const name = String(formData.get("game-name") || "").trim();
  const url = normalizeGameUrl(String(formData.get("game-url") || "").trim());

  if (!name || !url) {
    gameFormStatus.textContent = "Βάλε όνομα και έγκυρο URL που αρχίζει με http:// ή https://.";
    return;
  }

  const game = { name, url };
  const nextGames = [...games, game];
  if (!saveGames(nextGames)) return;

  games.push(game);
  renderGames();
  addGameForm.reset();
  gameFormStatus.textContent = "";
  setAddGameFormVisible(false);
});

async function requestBrowserCredentialSave(username, password) {
  if (
    !window.isSecureContext ||
    !("PasswordCredential" in window) ||
    !navigator.credentials?.store
  ) {
    credentialStatus.textContent =
      "Η αυτόματη συμπλήρωση είναι ενεργή. Η αίτηση αποθήκευσης μέσω του διαχειριστή κωδικών δεν υποστηρίζεται σε αυτόν τον browser.";
    return;
  }

  try {
    const credential = new window.PasswordCredential({ id: username, password });
    await navigator.credentials.store(credential);
    credentialStatus.textContent =
      "Υποβλήθηκε αίτημα αποθήκευσης στον browser. Η αποθήκευση ελέγχεται από τον browser.";
  } catch (error) {
    console.error("Could not request browser credential storage.", error);
    credentialStatus.textContent =
      "Δεν ήταν δυνατή η αποστολή αιτήματος αποθήκευσης στον browser.";
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = String(formData.get("username") || "").trim() || "Παίκτης";
  const password = String(formData.get("password") || "");
  credentialStatus.textContent = "";
  void requestBrowserCredentialSave(username, password);
  showLibrary(username);
});

document.getElementById("toggle-password").addEventListener("click", (event) => {
  const passwordInput = document.getElementById("password");
  const showPassword = passwordInput.type === "password";
  passwordInput.type = showPassword ? "text" : "password";
  event.currentTarget.textContent = showPassword ? "Απόκρυψη" : "Εμφάνιση";
  event.currentTarget.setAttribute("aria-label", showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού");
});

document.getElementById("logout-button").addEventListener("click", () => {
  loginForm.reset();
  libraryView.hidden = true;
  accountBar.hidden = true;
  loginView.hidden = false;
});
