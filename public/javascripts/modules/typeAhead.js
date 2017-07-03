import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHtml(stores) {
  return stores.map(s => {
    return `
      <a href="/stores/${s.slug}" class="search__result">
        <strong>${s.name}</strong>
      </a>
    `;
  }).join('');
}

function typeAhead(search) {
  if (!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    searchResults.style.display = 'block';
    searchResults.innerHTML = '';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(searchResultsHtml(res.data));
          return;
        }
        searchResults.innerHTML = dompurify.sanitize(`
          <div class="search__result">
            No results for "${this.value}"
          </div>
        `);
      })
      .catch(console.err);
  });

  // handle keyboard inputs
  const keyCodes = [38, 40, 13];
  searchInput.on('keyup', (e) => {
    if (!keyCodes.includes(e.keyCode)) {
      // if they aren't pressing up, down, enter - who cares!
      return;
    }

    const activeClass = 'search__result--active';
    const current = searchResults.querySelector(`.${activeClass}`);
    const items = searchResults.querySelectorAll('.search__result');
    let next;

    if (e.keyCode === 40 /*down*/ && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      next = items[0];
    } else if (e.keyCode === 38 /*up*/ && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 /*enter*/ && current.href) {
      window.location = current.href;
    }

    if (next) {
      current && current.classList.remove(activeClass);
      next.classList.add(activeClass);
    }
  });
}

export default typeAhead;