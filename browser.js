import lunr from "lunr";
import Mustache from "mustache";
import scrollIntoView from "scroll-into-view-if-needed";
import Mark from "mark.js";
import truncate from "truncate-html";

const Pitchfork = {
  init: function (settings) {
    this.input = settings.input;
    this.indexURL = settings.indexURL;
    this.resultsNode = settings.resultsNode;
    this.highlightedResultNode;
    this.loadTemplate();
    this.addListeners();
  },
  loadTemplate: function () {
    // Get the template then remove it
    this.resultsTemplate = this.resultsNode.innerHTML;
    this.resultsNode.innerHTML = "";
  },
  addListeners: function () {
    this.input.addEventListener("keydown", (e) => {
      if (e.keyCode === 38 && e.metaKey) {
        // Cmd + up
        e.preventDefault();
        this.setNodeActive(this.resultsNode.firstElementChild);
      } else if (e.keyCode === 38) {
        // Up
        e.preventDefault();
        this.highlightPrevResult();
      } else if (e.keyCode === 40 && e.metaKey) {
        // Cmd + down
        e.preventDefault();
        this.setNodeActive(this.resultsNode.lastElementChild);
      } else if (e.keyCode === 40) {
        // Down
        e.preventDefault();
        this.highlightNextResult();
      } else if (e.keyCode === 27) {
        // Escape
        this.hideResults();
      } else if (e.keyCode === 13) {
        // Enter
        this.selectHighlighted();
      }
    });
    this.input.addEventListener("keyup", (e) => {
      // Ignore all arrows (no change in text), escape and enter
      if ([37, 38, 39, 40, 27, 13].includes(e.keyCode)) return;
      this.onSearchInputChange(e);
    });
    this.input.addEventListener("focusout", (e) => {
      // If a link was clicked, ignore this
      if (e.relatedTarget && e.relatedTarget.nodeName === "A") return;
      this.hideResults();
    });
    this.input.addEventListener("focusin", (e) => {
      if (!this.index) {
        this.loadIndex();
      }
    });
  },
  loadIndex: function () {
    const pf = this;
    // TODO catch 404 or fetch error
    fetch(this.indexURL)
      .then((response) => response.json())
      .then((data) => {
        pf.searchContent = data.pages;
        pf.index = lunr.Index.load(data.lunr);
      });
  },
  hideResults: function () {
    this.resultsNode.style.display = "none";
  },
  showResults: function () {
    this.resultsNode.style.display = "";
  },
  onSearchInputChange: function () {
    this.renderResults([]);

    // Empty search stops here
    if (!this.input.value) {
      this.hideResults();
      return;
    }

    this.showResults();

    const searchResults = this.index.search(this.input.value);

    if (searchResults.length < 1) {
      this.renderResults([]);
      this.highlightedResultNode = null;
      return;
    }

    this.renderResults([]);

    const truncateLength = parseInt(
      this.resultsNode.getAttribute("data-pitchfork-truncate") || 100
    );
    const highlightClass =
      this.resultsNode.getAttribute("data-pitchfork-highlight-class") ||
      "highlight";

    const pf = this;

    const results = searchResults.map(function (res) {
      const url = res.ref;
      var contentData = pf.searchContent[url];

      const highlights = {};

      pf.index.fields.forEach((f) => {
        let text = contentData[f];
        if (!text) return;

        const ranges = [];
        let startIndex = 99999;
        Object.values(res.matchData.metadata).forEach((matchMetadata) => {
          if (
            !matchMetadata ||
            !matchMetadata[f] ||
            !matchMetadata[f].position
          ) {
            return;
          }
          matchMetadata[f].position.forEach((position) => {
            startIndex = Math.min(position[0], startIndex);
            ranges.push({ start: position[0], length: position[1] });
          });
        });

        const el = document.createElement("div");
        el.innerHTML = text;
        const instance = new Mark(el);
        instance.markRanges(ranges, {
          className: highlightClass,
        });

        let final = el.innerHTML;
        if (contentData[f].length > truncateLength) {
          if (startIndex > truncateLength / 3) {
            // Only trim the beginning if there is a lot
            final = final.substr(startIndex);
          }
          final = truncate(final, truncateLength);
        }
        highlights[f] = final;
      });

      return {
        url,
        highlights,
        ...contentData,
      };
    });

    this.renderResults(results);

    this.setNodeActive(this.resultsNode.firstElementChild);
  },
  setNodeActive: function (node) {
    const activeClass =
      this.resultsNode.getAttribute("data-pitchfork-active-class") || "active";
    if (!activeClass) return;

    const activeClasses = activeClass.split(" ");

    // Remove the previous highlight
    if (this.highlightedResultNode) {
      this.highlightedResultNode.classList.remove(...activeClasses);
    }

    // Highlight the new one
    node.classList.add(...activeClasses);
    this.highlightedResultNode = node;

    scrollIntoView(this.highlightedResultNode, {
      behavior: "smooth",
      scrollMode: "if-needed",
    });
  },
  highlightNextResult: function () {
    const n = this.highlightedResultNode.nextElementSibling;
    if (n) this.setNodeActive(n);
  },
  highlightPrevResult: function () {
    const n = this.highlightedResultNode.previousElementSibling;
    if (n) this.setNodeActive(n);
  },
  selectHighlighted: function () {
    if (this.highlightedResultNode)
      window.location = this.highlightedResultNode.href;
  },
  renderResults: function (results) {
    this.resultsNode.innerHTML = Mustache.render(this.resultsTemplate, {
      results: results,
    });
  },
};

window.Pitchfork = Pitchfork;

window.addEventListener("DOMContentLoaded", (event) => {
  const input = document.querySelector("[data-pitchfork-input]");
  if (input) {
    window.Pitchfork.init({
      input: input,
      indexURL: document
        .querySelector("[data-pitchfork-index-url]")
        .getAttribute("data-pitchfork-index-url"),
      resultsNode: document.querySelector("[data-pitchfork-results]"),
    });
  }
});
