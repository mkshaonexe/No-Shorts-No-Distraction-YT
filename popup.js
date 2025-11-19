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
    console.log('✓ Popup Elements Initialized:', {
        mainToggle: !!mainToggle,
        toggleExtension: !!toggleExtension,
        toggleShorts: !!toggleShorts,
        toggleHideFeed: !!toggleHideFeed,
        toggleComments: !!toggleComments,
        toggleMotivation: !!toggleMotivation,
        timer: !!timer,
        remainingTime: !!remainingTime
    });

    // Timer functionality
    /**
     * Track when the extension was loaded for the elapsed timer.
     * This variable stores the timestamp (in milliseconds) when the extension was loaded.
     */
    let startTime = Date.now();
    /**
     * Main toggle state - true = extension ON (blocking), false = extension OFF.
     * This variable controls the overall state of the extension.
     */
    let isActive = true;
    /**
     * Interval reference for the countdown timer.
     * This variable stores the ID of the interval used for the countdown timer.
     */
    let countdownInterval = null;
    /**
     * Countdown duration: 10 minutes = 600 seconds.
     * This variable stores the remaining time (in seconds) for the countdown timer.
     */
    let remainingSeconds = 600;

    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateCountdownTimer() {
        if (!isActive && remainingSeconds > 0) {
            remainingSeconds--;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            remainingTime.textContent = `Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Auto turn ON when countdown completes
            if (remainingSeconds === 0) {
                console.log('Countdown completed! Auto-enabling extension...');
                mainToggle.click(); // Auto-enable extension
                remainingSeconds = 600; // Reset to 10 minutes
            }
        }
    }

    function startCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(updateCountdownTimer, 1000);
    }

    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        remainingSeconds = 600; // Reset to 10 minutes
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
            
            // Store countdown start time when turning OFF
            const countdownEndTime = Date.now() + (remainingSeconds * 1000);
            chrome.storage.local.set({ countdownEndTime: countdownEndTime });
        } else {
            // When main toggle is ON, restore default settings
            toggleExtension.checked = true;
            toggleShorts.checked = true;  // Default: Block Shorts
            
            // Clear countdown when turning back ON
            chrome.storage.local.remove('countdownEndTime');
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
            // Notify content script with individual messages for each feature
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0]) {
                    const tabId = tabs[0].id;
                    
                    // Send main extension toggle
                    chrome.tabs.sendMessage(tabId, { 
                        action: 'toggleExtension', 
                        enabled: isActive
                    });
                    
                    // Send shorts toggle
                    chrome.tabs.sendMessage(tabId, { 
                        action: 'toggleShorts', 
                        hideShorts: isActive ? true : false
                    });
                    
                    // Send hide feed toggle
                    chrome.tabs.sendMessage(tabId, { 
                        action: 'toggleHideFeed', 
                        hideFeed: false
                    });
                    
                    // Send comments toggle
                    chrome.tabs.sendMessage(tabId, { 
                        action: 'toggleComments', 
                        hideComments: false
                    });
                    
                    // Send motivation toggle
                    chrome.tabs.sendMessage(tabId, { 
                        action: 'toggleMotivation', 
                        motivationEnabled: false
                    });
                    
                    console.log('All feature toggle messages sent');
                } else {
                    console.log('Error: No active tab found');
                }
            });
        });
    });

    function updateMainToggleState(active, preserveCountdown = false) {
        if (active) {
            mainToggle.classList.remove('inactive');
            mainToggle.classList.add('active');
            toggleIcon.textContent = '✕';
            subtitle.textContent = 'Tap To Turn Off';
            statusText.textContent = 'Blocked';
            statusText.className = 'blocked';
            
            // Hide timer and remaining time when extension is ON
            timer.style.display = 'none';
            remainingTime.style.display = 'none';
            stopCountdown();
        } else {
            mainToggle.classList.remove('active');
            mainToggle.classList.add('inactive');
            toggleIcon.textContent = '▶';
            subtitle.textContent = 'Tap To Turn On';
            statusText.textContent = 'Unblocked';
            statusText.className = 'unblocked';
            
            // Show timer and remaining time when extension is OFF
            timer.style.display = 'block';
            remainingTime.style.display = 'block';
            
            // Only reset countdown if not preserving it (i.e., when manually toggling)
            if (!preserveCountdown) {
                remainingSeconds = 600; // Reset to 10 minutes
            }
            
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            remainingTime.textContent = `Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            startCountdown();
        }
    }

    // Load initial states with default values on first install
    chrome.storage.local.get(['enabled', 'hideComments', 'hideFeed', 'motivationEnabled', 'hideShorts', 'initialized', 'countdownEndTime'], function(result) {
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
        
        // If extension is OFF and countdown is active, restore remaining time
        let hasActiveCountdown = false;
        if (!isActive && result.countdownEndTime) {
            const now = Date.now();
            const timeLeft = Math.max(0, Math.floor((result.countdownEndTime - now) / 1000));
            
            if (timeLeft > 0) {
                // Countdown still active
                remainingSeconds = timeLeft;
                hasActiveCountdown = true;
                console.log(`Countdown restored: ${remainingSeconds} seconds remaining`);
            } else {
                // Countdown expired while extension was closed - auto turn ON
                console.log('Countdown expired, auto-enabling extension...');
                isActive = true;
                chrome.storage.local.set({ enabled: true });
                chrome.storage.local.remove('countdownEndTime');
            }
        }
        
        updateMainToggleState(isActive, hasActiveCountdown);

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