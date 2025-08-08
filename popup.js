document.getElementById('processButton').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['content.js'] // Ensure content.js is injected if not already
        }, () => {
          // After ensuring the script is injected, send the message
          chrome.tabs.sendMessage(tabs[0].id, {action: "processPage"}, function(response) {
            if (chrome.runtime.lastError) {
              // Handle errors (e.g., if the content script isn't there or doesn't respond)
              console.error(chrome.runtime.lastError.message);
              // Optionally, you could try injecting again or alert the user.
            } else if (response && response.status) {
              console.log(response.status);
              // window.close(); // Optionally close the popup
            }
          });
        });
      } else {
        console.error("Could not get active tab ID.");
      }
    });
  });