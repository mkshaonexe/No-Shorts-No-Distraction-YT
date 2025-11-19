document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup script loaded!');
    
    // UI Elements
    const mainToggle = document.getElementById('mainToggle');
    const toggleIcon = document.getElementById('toggleIcon');
    const subtitle = document.getElementById('subtitle');
    const statusText = document.getElementById('statusText');
    const remainingTime = document.getElementById('remainingTime');
    const timer = document.getElementById('timer');
    
    // Menu Elements
    const menuBtn = document.getElementById('menuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    const closeBtn = document.getElementById('closeBtn');
    
    // Feature toggles in menu
    const toggleExtension = document.getElementById('toggleExtension');
    const toggleShorts = document.getElementById('toggleShorts');
    const toggleHideFeed = document.getElementById('toggleHideFeed');
    const toggleMotivation = document.getElementById('toggleMotivation');
    const toggleComments = document.getElementById('toggleComments');
    
    // Verify all elements are found
    console.log('Elements found:', {
        mainToggle: !!mainToggle,
        toggleExtension: !!toggleExtension,
        toggleShorts: !!toggleShorts,
        toggleHideFeed: !!toggleHideFeed,
        toggleComments: !!toggleComments,
        toggleMotivation: !!toggleMotivation
    });

    // Timer functionality
    let startTime = Date.now();
    let isActive = true;

    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update timer every second
    setInterval(updateTimer, 1000);

    // Menu functionality
    menuBtn.addEventListener('click', function() {
        menuOverlay.classList.add('active');
    });

    closeBtn.addEventListener('click', function() {
        menuOverlay.classList.remove('active');
    });

    // Close menu when clicking outside
    menuOverlay.addEventListener('click', function(e) {
        if (e.target === menuOverlay) {
            menuOverlay.classList.remove('active');
        }
    });

    // Main toggle functionality - Master control for all features
    mainToggle.addEventListener('click', function() {
        isActive = !isActive;
        updateMainToggleState(isActive);
        
        // Sync with menu toggle
        toggleExtension.checked = isActive;
        
        // When main toggle is OFF, turn OFF all menu features
        if (!isActive) {
            toggleShorts.checked = false;
            toggleHideFeed.checked = false;
            toggleComments.checked = false;
            toggleMotivation.checked = false;
        } else {
            // When main toggle is ON, restore default settings
            toggleExtension.checked = true;
            toggleShorts.checked = true;  // Default: Block Shorts
        }
        
        // Update all states in storage
        chrome.storage.local.set({ 
            enabled: isActive,
            hideShorts: isActive ? true : false,  // Only active if main is ON
            hideFeed: false,
            hideComments: false,
            motivationEnabled: false
        }, function() {
            console.log('Main toggle changed:', isActive);
            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    // Send all toggle states to content script
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        action: 'toggleExtension', 
                        enabled: isActive,
                        hideShorts: isActive ? true : false,
                        hideFeed: false,
                        hideComments: false,
                        motivationEnabled: false
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.log('Error sending main toggle message:', chrome.runtime.lastError);
                        }
                    });
                } else {
                    console.log('Error: No active tab found');
                }
            });
        });
    });

    function updateMainToggleState(active) {
        if (active) {
            mainToggle.classList.remove('inactive');
            mainToggle.classList.add('active');
            toggleIcon.textContent = '✕';
            subtitle.textContent = 'Tap To Turn Off';
            statusText.textContent = 'Blocked';
            statusText.className = 'blocked';
        } else {
            mainToggle.classList.remove('active');
            mainToggle.classList.add('inactive');
            toggleIcon.textContent = '▶';
            subtitle.textContent = 'Tap To Turn On';
            statusText.textContent = 'Unblocked';
            statusText.className = 'unblocked';
        }
    }

    // Load initial states with default values on first install
    chrome.storage.local.get(['enabled', 'hideComments', 'hideFeed', 'motivationEnabled', 'hideShorts', 'initialized'], function(result) {
        // Check if this is first install
        if (!result.initialized) {
            // Set default values on first install
            chrome.storage.local.set({
                enabled: true,
                hideShorts: true,  // Default: Block Shorts
                hideComments: false,
                hideFeed: true, // Default: Hide Recommendations
                motivationEnabled: false,
                initialized: true
            });
        }

        // Main toggle state
        isActive = result.enabled !== false; // Default to true
        updateMainToggleState(isActive);

        // Extension toggle state (Hide Recommendations)
        toggleExtension.checked = result.enabled !== false; // Default to true

        // Shorts toggle state (Block Shorts) - Default to true
        toggleShorts.checked = result.hideShorts !== false; // Default to true (hide shorts by default)

        // Hide Feed toggle state
        toggleHideFeed.checked = result.hideFeed === true; // Default to false

        // Motivation Mode toggle state
        toggleMotivation.checked = result.motivationEnabled === true; // Default to false

        // Hide Comments toggle state
        toggleComments.checked = result.hideComments === true; // Default to false
    });

    // Handle extension toggle changes
    toggleExtension.addEventListener('change', function(e) {
        console.log('toggleExtension change event fired!', e);
        const enabled = toggleExtension.checked;
        isActive = enabled;
        updateMainToggleState(isActive);
        
        chrome.storage.local.set({ enabled: enabled }, function() {
            console.log('Extension toggle changed:', enabled);
            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension', enabled: enabled }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.log('Error sending message:', chrome.runtime.lastError);
                        } else {
                            console.log('Message sent successfully!');
                        }
                    });
                }
            });
        });
    });
    
    // Add click event to toggle's parent for better clickability
    toggleExtension.addEventListener('click', function(e) {
        console.log('toggleExtension clicked!', e);
    });

    // Handle Shorts toggle changes
    toggleShorts.addEventListener('change', function(e) {
        console.log('toggleShorts change event fired!', e);
        const hideShorts = toggleShorts.checked;
        chrome.storage.local.set({ hideShorts: hideShorts }, function() {
            console.log('Shorts toggle changed:', hideShorts);
            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleShorts', hideShorts: hideShorts }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.log('Error sending shorts message:', chrome.runtime.lastError);
                        } else {
                            console.log('Shorts toggle message sent successfully!');
                        }
                    });
                } else {
                    console.log('Error: No active tab found for shorts toggle');
                }
            });
        });
    });

    // Handle Hide Feed toggle changes
    toggleHideFeed.addEventListener('change', function() {
        const hideFeed = toggleHideFeed.checked;
        chrome.storage.local.set({ hideFeed: hideFeed }, function() {
            console.log('Hide Feed toggle changed:', hideFeed);
            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleHideFeed', hideFeed: hideFeed }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.log('Error sending hide feed message:', chrome.runtime.lastError);
                        }
                    });
                }
            });
        });
    });

    // Handle Motivation Mode toggle changes
    toggleMotivation.addEventListener('change', function() {
        const motivationEnabled = toggleMotivation.checked;
        chrome.storage.local.set({ motivationEnabled: motivationEnabled }, function() {
            console.log('Motivation Mode toggle changed:', motivationEnabled);
            // If Motivation Mode is enabled, automatically turn on Hide Feed
            if (motivationEnabled) {
                toggleHideFeed.checked = true;
                const hideFeed = toggleHideFeed.checked;
                chrome.storage.local.set({ hideFeed: hideFeed }, function() {
                    console.log('Hide Feed toggle changed:', hideFeed);
                    // Notify content script about Hide Feed change
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        if (tabs && tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleHideFeed', hideFeed: hideFeed }, function(response) {
                                if (chrome.runtime.lastError) {
                                    console.log('Error sending hide feed message:', chrome.runtime.lastError);
                                }
                            });
                        }
                    });
                });
            }

            // Notify content script about Motivation Mode change
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleMotivation', motivationEnabled: motivationEnabled }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.log('Error sending motivation message:', chrome.runtime.lastError);
                        }
                    });
                }
            });
        });
    });

    // Handle Hide Comments toggle changes
    toggleComments.addEventListener('change', function() {
        const hideComments = toggleComments.checked;
        chrome.storage.local.set({ hideComments: hideComments }, function() {
            console.log('Hide Comments toggle changed:', hideComments);
            // Notify content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleComments', hideComments: hideComments }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.log('Error sending hide comments message:', chrome.runtime.lastError);
                        }
                    });
                }
            });
        });
    });
});