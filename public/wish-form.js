// Live product preview for the wish form: when a link is pasted or changed,
// ask the server to look it up and show the name, photo and price, and offer
// the product name as the description. The form works without this script.
(() => {
  const form = document.querySelector("form.wish-form");
  if (!form) return;
  const endpoint = form.dataset.preview;
  const lastLookedUp = new Map();

  function show(box, { title, image, price }) {
    box.replaceChildren();
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      box.append(img);
    }
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = title;
    text.append(name);
    if (price) {
      const p = document.createElement("div");
      p.className = "price";
      p.textContent = price;
      text.append(p);
    }
    box.append(text);
  }

  function message(box, text) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = text;
    box.replaceChildren(p);
  }

  async function lookUp(input) {
    const n = input.dataset.previewFor;
    const box = document.getElementById(`preview${n}`);
    const description = document.getElementById(`text${n}`);
    const link = input.value.trim();
    if (lastLookedUp.get(n) === link) return;
    lastLookedUp.set(n, link);
    if (!link) {
      box.replaceChildren();
      description.placeholder = "";
      return;
    }
    if (!input.checkValidity()) return;

    message(box, form.dataset.looking);
    try {
      const res = await fetch(`${endpoint}&url=${encodeURIComponent(link)}`);
      const data = res.ok ? await res.json() : {};
      if (lastLookedUp.get(n) !== link) return; // a newer link was entered meanwhile
      if (res.status === 429) {
        message(box, form.dataset.limited);
        return;
      }
      if (data.title || data.image) {
        show(box, data);
        // The name is used when the description is left empty.
        description.placeholder = data.title;
      } else {
        message(box, form.dataset.none);
        description.placeholder = "";
        description.focus();
      }
    } catch {
      message(box, form.dataset.none);
    }
  }

  for (const input of form.querySelectorAll("input[data-preview-for]")) {
    input.addEventListener("change", () => lookUp(input));
    input.addEventListener("paste", () => setTimeout(() => lookUp(input), 0));
  }
})();
