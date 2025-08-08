// content.js

const ELEMENTS_TO_SKIP_PROCESSING_INSIDE = [
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CANVAS', 'SVG',
  'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'EMBED', 'INPUT',
  'SELECT', 'BUTTON', 'PRE', 'CODE', 'FORM', 'FIELDSET', 'LABEL',
  'HEAD', 'DETAILS'
];

/**
 * Checks if an element (typically a text node's parent) or its ancestors
 * make the text effectively bold.
 * @param {Node} element - The starting element (e.g., textNode.parentNode).
 * @returns {boolean} True if bold context, false otherwise.
 */
function isContextAlreadyBold(element) {
  let currentElement = element;
  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE && currentElement.nodeName.toUpperCase() !== 'BODY') {
    if (['B', 'STRONG'].includes(currentElement.nodeName.toUpperCase())) {
      return true;
    }
    const fontWeight = window.getComputedStyle(currentElement).getPropertyValue('font-weight');
    if (fontWeight === 'bold' || fontWeight === '700' || parseInt(fontWeight) >= 600) {
      return true;
    }
    currentElement = currentElement.parentNode;
  }
  return false;
}

/**
 * Tries to determine if the element is in a "dark mode" context
 * (light text on dark background).
 * @param {Node} element - The element to check (usually textNode.parentNode).
 * @returns {boolean} True if likely dark mode context, false otherwise.
 */
function isLikelyDarkModeContext(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }

    const osPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const styles = window.getComputedStyle(element);
    const bgColor = styles.backgroundColor;
    const fgColor = styles.color;

    function getLuminance(colorStr) {
        if (!colorStr) return 128; // Neutral luminance for undefined color
        const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b; // Standard luminance formula
        }
        // Basic handling for hex colors (can be expanded)
        const hexMatch = colorStr.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
        if (hexMatch) {
            const r = parseInt(hexMatch[1], 16);
            const g = parseInt(hexMatch[2], 16);
            const b = parseInt(hexMatch[3], 16);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        const shortHexMatch = colorStr.match(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/);
        if (shortHexMatch) {
            const r = parseInt(shortHexMatch[1] + shortHexMatch[1], 16);
            const g = parseInt(shortHexMatch[2] + shortHexMatch[2], 16);
            const b = parseInt(shortHexMatch[3] + shortHexMatch[3], 16);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        // If color is 'transparent' or unparsable, it's hard to determine context here.
        // A more robust solution would trace back to a non-transparent background.
        // For this function, we'll assume neutral if unparsed or transparent.
        if (colorStr === 'transparent' || colorStr.startsWith('rgba(0, 0, 0, 0)')) return 128; // Treat transparent as neutral for its own luminance
        return 128; // Default to neutral for other unparsed/unknown color formats
    }

    const bgLuminance = getLuminance(bgColor);
    const fgLuminance = getLuminance(fgColor);

    // Define "dark" background as luminance < 100 (adjust as needed)
    // Define "light" foreground as luminance > 150 (adjust as needed)
    const localContextIsDarkScheme = bgLuminance < 100 && fgLuminance > 150;

    // Prioritize OS preference if local context also somewhat aligns,
    // or strongly rely on local context if it's definitively a dark scheme.
    return (osPrefersDark && localContextIsDarkScheme) || localContextIsDarkScheme;
}


/**
 * Processes a given text node to make the first half of each word bold,
 * with special styling for dark mode contexts.
 * @param {Node} textNode - The text node to process.
 */
function processTextNode(textNode) {
  if (textNode.parentNode && isContextAlreadyBold(textNode.parentNode)) {
    return;
  }

  const words = textNode.nodeValue.split(/(\s+)/);
  const fragment = document.createDocumentFragment();
  let modified = false;

  const applyDarkModeEnhancements = textNode.parentNode ? isLikelyDarkModeContext(textNode.parentNode) : false;

  words.forEach(word => {
    if (word.trim().length === 0) {
      fragment.appendChild(document.createTextNode(word));
    } else {
      const midPoint = Math.ceil(word.length / 2);
      const firstHalfText = word.substring(0, midPoint);
      const secondHalfText = word.substring(midPoint);

      if (firstHalfText.length > 0) {
        if (applyDarkModeEnhancements) {
          const firstHalfSpan = document.createElement('span');
          firstHalfSpan.textContent = firstHalfText;
          // Updated styles for dark mode "bolded" first half as per user's request
          firstHalfSpan.style.fontWeight = 'bold'; // Set to bold
          firstHalfSpan.style.color = '#D4D4D4'; // Slightly lighter gray

          fragment.appendChild(firstHalfSpan);

          if (secondHalfText.length > 0) {
            const secondHalfSpan = document.createElement('span');
            secondHalfSpan.textContent = secondHalfText;
            // Updated style for dark mode "normal" second half as per user's request
            secondHalfSpan.style.fontWeight = 'normal'; // Ensure it's not inheriting unwanted boldness
            secondHalfSpan.style.color = '#AAAAAA'; // Normal light gray
            fragment.appendChild(secondHalfSpan);
          }
        } else {
          // Standard bolding for light backgrounds
          const boldElement = document.createElement('strong');
          boldElement.textContent = firstHalfText;
          fragment.appendChild(boldElement);
          if (secondHalfText.length > 0) {
            fragment.appendChild(document.createTextNode(secondHalfText));
          }
        }
        modified = true;
      } else if (secondHalfText.length > 0) { // Should be rare if firstHalfText is empty
        fragment.appendChild(document.createTextNode(secondHalfText));
      }
    }
  });

  if (modified && textNode.parentNode) {
    textNode.parentNode.replaceChild(fragment, textNode);
  }
}

/**
 * Main function to find and process all relevant text nodes on the page.
 */
function boldifyAllText() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.nodeValue.trim().length === 0) {
          return NodeFilter.FILTER_SKIP;
        }
        let parent = node.parentElement;
        while (parent && parent !== document.documentElement) {
          if (parent.nodeType === Node.ELEMENT_NODE) {
            const parentNodeName = parent.nodeName.toUpperCase();
            if (ELEMENTS_TO_SKIP_PROCESSING_INSIDE.includes(parentNodeName) ||
                parent.isContentEditable ||
                window.getComputedStyle(parent).getPropertyValue('display') === 'none') {
              return NodeFilter.FILTER_REJECT;
            }
          }
          parent = parent.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodesToProcess = [];
  let currentNode;
  while (currentNode = walker.nextNode()) {
    nodesToProcess.push(currentNode);
  }

  nodesToProcess.forEach(textNode => {
    processTextNode(textNode);
  });

  console.log(`Half-Bold Plugin: Attempted to process ${nodesToProcess.length} text nodes.`);
}

// --- Trigger Mechanism ---
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "processPage") {
    console.log("Half-Bold Plugin (TreeWalker with DarkModeEnhancements): Processing page content...");
    try {
      boldifyAllText();
      sendResponse({status: "Page processed by Half-Bold Plugin (TreeWalker w/ DarkModeEnhancements)"});
    } catch (e) {
      console.error("Half-Bold Plugin Error:", e);
      sendResponse({status: "Error during processing", error: e.toString()});
    }
    return true;
  }
});

console.log("Half-Bold Content Script (TreeWalker w/ DarkModeEnhancements) Loaded and Ready.");
