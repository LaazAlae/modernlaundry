// Initialize core functionality and critical variables immediately
const API_URL = '/api';
let deferredPrompt;
let selectedMachineId = null;
let machineData = []; // Cache for machine data
let lastFetchTime = 0;
const FETCH_THROTTLE_MS = 1000; // Minimum time between API calls

// Utility functions (moved to top for hoisting benefits)
function getTimeLeft(endTime) {
    if (!endTime) return 0;
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, diff / 1000);
}

function formatTimeSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function updateLastUpdated() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const footerText = document.getElementById('footerText');
    if (footerText) {
        footerText.textContent = `updated: ${time}`;
    }
}

// HTML generator functions
function createMachineHTML(machine, savedState) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;
    const status = isActive ? 'in-use' : 'available';
    const statusText = isActive ? 'In Use' : 'Available';

    // Check saved email and subscription status
    const savedEmail = localStorage.getItem('userEmail');
    const isCurrentUser = savedEmail && machine.currentUserEmail === savedEmail;
    
    // Check if user is subscribed for notifications
    let isSubscribed = savedEmail && 
                      machine.notifyUsers && 
                      machine.notifyUsers.some(user => user.email === savedEmail);
    
    // If we have saved state from a user toggle, respect that instead of the server state
    if (savedState && savedState.userUnsubscribed !== undefined) {
        isSubscribed = !savedState.userUnsubscribed;
    }
    
    // Bell icon classes and SVG
    const bellClass = isSubscribed ? 'subscribed' : 'not-subscribed';
    const bellIcon = `
        <div class="notification-bell ${bellClass}" data-machine-id="${machine._id}">
            ${isSubscribed ? 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>` : 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>`}
        </div>
    `;

    // Time display for active machines
    let timeDisplay = '';
    if (isActive) {
        const timeLeft = getTimeLeft(machine.endTime);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        timeDisplay = `<div class="text-3xl font-bold">${minutes}m <span class="text-xl text-gray-400">${seconds}s</span></div>`;
    }

    // Format the last used time
    const lastUsedTime = machine.lastEndTime ? formatTimeSince(machine.lastEndTime) : 'never';

    return `
        <div class="machine-card ${status}" data-machine-id="${machine._id}" ${isSubscribed ? 'data-user-unsubscribed="false"' : 'data-user-unsubscribed="true"'}>
            <div class="flex justify-between items-start w-full">
                <div>
                    <span class="status-badge ${status} mb-3">${statusText}</span>
                    <h2 class="text-2xl font-bold mb-4">${machine.name}</h2>
                    ${isActive ? `
                        <div class="text-gray-400 mb-4">${timeDisplay}</div>
                    ` : `
                        <div class="text-gray-400">Ready to use</div>
                        <div class="text-sm text-gray-500 mt-2">Last timer ended: ${lastUsedTime}</div>
                    `}
                </div>
                ${bellIcon}
            </div>
        </div>
    `;
}

// Main initialization function
function initializeApp() {
    // Set up event listeners
    initializeNotifyButton();
    initializePWAInstall();
    
    // Start fetching data immediately
    fetchAndUpdateMachines();
    
    // Set up regular updates - use requestAnimationFrame for better performance
    let lastTime = 0;
    function updateLoop(timestamp) {
        if (!lastTime || timestamp - lastTime >= FETCH_THROTTLE_MS) {
            lastTime = timestamp;
            fetchAndUpdateMachines(false); // false = non-forced update
        }
        window.requestAnimationFrame(updateLoop);
    }
    window.requestAnimationFrame(updateLoop);
    
    // Add event listeners for modals
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Add event listeners for timer modal
    const timeInput = document.getElementById('timeInput');
    if (timeInput) {
        timeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const errorMessage = document.getElementById('errorMessage');
            const startButton = document.getElementById('startButton');
            
            if (errorMessage && startButton) {
                if (value < 5 || value > 90) {
                    errorMessage.style.display = 'block';
                    startButton.disabled = true;
                } else {
                    errorMessage.style.display = 'none';
                    startButton.disabled = false;
                }
            }
        });
    }
    
    // Start button in timer modal
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', startMachine);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const timerModal = document.getElementById('timerModal');
        const emailModal = document.getElementById('emailModal');
        
        if (e.target === timerModal) {
            timerModal.style.display = 'none';
        }
        if (e.target === emailModal) {
            emailModal.style.display = 'none';
        }
    });
}

// Settings button functionality
function initializeNotifyButton() {
    const settingsBtn = document.getElementById('settingsBtn');
    const emailModal = document.getElementById('emailModal');
    const emailInput = document.getElementById('emailInput');
    
    if (!settingsBtn) {
        console.error('Settings button not found');
        return;
    }
    
    const savedEmail = localStorage.getItem('userEmail');

    // Pre-fill email if exists
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
    }

    settingsBtn.addEventListener('click', () => {
        if (emailModal) {
            emailModal.style.display = 'flex';
            if (savedEmail && emailInput) {
                emailInput.value = savedEmail;
            }
        }
    });

    const saveEmailButton = document.getElementById('saveEmailButton');
    if (saveEmailButton) {
        saveEmailButton.addEventListener('click', () => {
            if (!emailInput) return;
            
            const email = emailInput.value.trim();
            if (isValidEmail(email)) {
                localStorage.setItem('userEmail', email);
                emailModal.style.display = 'none';
                showToast('Email saved successfully!');
            } else {
                showToast('Please enter a valid email address', 'error');
            }
        });
    }
}

// PWA installation
function initializePWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Check if we're already in standalone mode or if the prompt was dismissed before
        if (window.matchMedia('(display-mode: standalone)').matches || 
            localStorage.getItem('installPromptDismissed')) {
            return;
        }
        
        // Create and show the install banner
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <p>Install Flint Laundry for easier access!</p>
            <button id="installButton" class="install-button">Install</button>
        `;
        
        document.body.appendChild(installBanner);
        
        document.getElementById('installButton').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the installation`);
                deferredPrompt = null;
                installBanner.remove();
            }
        });
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
    });
}

// Machine timer functions
async function openTimerModal(machineId) {
    try {
        // First check if we have this machine in cached data
        let machine = machineData.find(m => m._id === machineId);
        
        // If not cached or data is stale, fetch from API
        if (!machine || Date.now() - lastFetchTime > 5000) {
            const response = await fetch(`${API_URL}/machines/${machineId}`);
            if (!response.ok) throw new Error('Failed to fetch machine data');
            machine = await response.json();
        }
        
        if (!machine) {
            console.error('Machine not found');
            return;
        }

        selectedMachineId = machineId;
        const modal = document.getElementById('timerModal');
        const modalTitle = document.getElementById('modalTitle');
        const timeInput = document.getElementById('timeInput');

        if (!modal || !modalTitle || !timeInput) {
            console.error('Modal elements not found');
            return;
        }

        modalTitle.textContent = machine.name;
        timeInput.value = machine.defaultTime || 30;
        
        // Check if user has email set
        const savedEmail = localStorage.getItem('userEmail');
        
        // Show email request if no email saved
        const emailRequestDiv = document.getElementById('emailRequestSection');
        if (emailRequestDiv) {
            emailRequestDiv.style.display = savedEmail ? 'none' : 'block';
        }
        
        // Reset error states
        const errorMessage = document.getElementById('errorMessage');
        const startButton = document.getElementById('startButton');
        
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        if (startButton) {
            startButton.disabled = false;
        }
        
        // Show modal
        modal.style.display = 'flex';
        timeInput.focus();
    } catch (error) {
        console.error('Error opening timer modal:', error);
        showToast('Error opening timer modal', 'error');
    }
}

// Start machine function
async function startMachine() {
    try {
        const timeInput = document.getElementById('timeInput');
        const timerEmailInput = document.getElementById('timerEmailInput');
        
        if (!timeInput) {
            showToast('Error: Time input not found', 'error');
            return;
        }
        
        const duration = parseInt(timeInput.value);
        
        // Get email - either from localStorage or from the timer modal input
        let email = localStorage.getItem('userEmail');
        let newEmailSubmitted = false;
        
        // If user just entered email in the timer modal
        if (timerEmailInput && timerEmailInput.value.trim() !== '' && 
            isValidEmail(timerEmailInput.value.trim())) {
            email = timerEmailInput.value.trim();
            localStorage.setItem('userEmail', email);
            newEmailSubmitted = true;
        }

        if (duration < 5 || duration > 90) {
            showToast('Please enter a time between 5 and 90 minutes', 'warning');
            return;
        }

        // Show loading indicator in the button
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
            `;
            startButton.disabled = true;
        }

        // Start the machine
        const response = await fetch(`/api/machines/${selectedMachineId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration, email })
        });

        // Close modal
        const timerModal = document.getElementById('timerModal');
        if (timerModal) {
            timerModal.style.display = 'none';
        }
        
        if (response.ok) {
            // Successfully started the machine
            if (email) {
                showToast('Started! You\'ll be notified 5 minutes before completion', 'success');
            } else {
                showToast('Machine started successfully', 'success');
            }
            
            // Force immediate update
            fetchAndUpdateMachines(true);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to start machine', 'error');
        }
    } catch (error) {
        console.error('Error starting machine:', error);
        showToast('Failed to start machine. Please try again.', 'error');
    } finally {
        // Reset button state
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.innerHTML = 'Start';
            startButton.disabled = false;
        }
    }
}

// Handle machine click
function handleMachineClick(machine) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;

    if (isActive) {
        // When clicking on an active machine, show details or info
        const savedEmail = localStorage.getItem('userEmail');
        const isSubscribed = savedEmail && 
                            machine.notifyUsers && 
                            machine.notifyUsers.some(user => user.email === savedEmail);
        
        if (isSubscribed) {
            showToast(`${machine.name} will be available in approximately ${Math.floor(getTimeLeft(machine.endTime) / 60)} minutes`, 'info');
        } else {
            showToast(`Click the bell icon if you want to be notified when ${machine.name} is ready`, 'info');
        }
    } else {
        // Show timer modal for available machines
        openTimerModal(machine._id);
    }
}

// Subscribe to machine notifications
async function subscribeToMachine(machineId, email) {
    try {
        // Update UI first for better responsiveness
        const bell = document.querySelector(`.notification-bell[data-machine-id="${machineId}"]`);
        if (bell) {
            bell.classList.remove('not-subscribed');
            bell.classList.add('subscribed');
            bell.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            `;
        }
        
        // Update machine data in DOM too
        const machineElement = document.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
        if (machineElement) {
            machineElement.setAttribute('data-user-unsubscribed', 'false');
        }
        
        // Update our cached data (optimistic update)
        const machineIndex = machineData.findIndex(m => m._id === machineId);
        if (machineIndex !== -1) {
            if (!machineData[machineIndex].notifyUsers) {
                machineData[machineIndex].notifyUsers = [];
            }
            
            // Add user if not already subscribed
            if (!machineData[machineIndex].notifyUsers.some(u => u.email === email)) {
                machineData[machineIndex].notifyUsers.push({ email, notified: false });
            }
        }
        
        showToast(`You'll be notified when this machine is almost ready`, 'success');
        
        // Call the backend to save the subscription
        const response = await fetch(`/api/machines/${machineId}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            throw new Error('Failed to subscribe');
        }
    } catch (error) {
        console.error('Subscription error:', error);
        // Don't revert UI to avoid confusing the user
        showToast('Error saving subscription, but we\'ll try to notify you', 'warning');
    }
}

// Unsubscribe from machine notifications
async function unsubscribeFromMachine(machineId, email) {
    try {
        // Update UI first for better responsiveness
        const bell = document.querySelector(`.notification-bell[data-machine-id="${machineId}"]`);
        if (bell) {
            bell.classList.remove('subscribed');
            bell.classList.add('not-subscribed');
            bell.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        }
        
        // Update machine data in DOM too
        const machineElement = document.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
        if (machineElement) {
            machineElement.setAttribute('data-user-unsubscribed', 'true');
        }
        
        // Update our cached data (optimistic update)
        const machineIndex = machineData.findIndex(m => m._id === machineId);
        if (machineIndex !== -1 && machineData[machineIndex].notifyUsers) {
            machineData[machineIndex].notifyUsers = machineData[machineIndex].notifyUsers
                .filter(u => u.email !== email);
        }
        
        showToast(`Notifications turned off for this machine`, 'info');
        
        // Call the backend to save the unsubscription
        const response = await fetch(`/api/machines/${machineId}/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            throw new Error('Failed to unsubscribe');
        }
    } catch (error) {
        console.error('Unsubscription error:', error);
        // Don't revert UI to avoid confusing the user
    }
}

// Toggle notification subscription
function toggleNotification(e, machineId) {
    e.stopPropagation(); // Prevent triggering the machine card click
    
    const bell = e.currentTarget;
    const isCurrentlySubscribed = bell.classList.contains('subscribed');
    const savedEmail = localStorage.getItem('userEmail');
    
    // Store the current toggle state in a data attribute to prevent auto-refresh from resetting it
    const machineCard = bell.closest('.machine-card');
    if (machineCard) {
        machineCard.setAttribute('data-user-unsubscribed', isCurrentlySubscribed ? 'true' : 'false');
    }
    
    // If already subscribed, unsubscribe immediately
    if (isCurrentlySubscribed && savedEmail) {
        unsubscribeFromMachine(machineId, savedEmail);
        return;
    }
    
    // If not subscribed and has email, subscribe
    if (!isCurrentlySubscribed && savedEmail) {
        // Get the machine to check if it's active
        const machine = machineData.find(m => m._id === machineId);
        
        if (machine) {
            const isActive = machine.inUse && 
                           machine.endTime && 
                           new Date(machine.endTime) > new Date();
            
            if (isActive) {
                // Check if machine has more than 5 minutes left
                const timeLeft = getTimeLeft(machine.endTime);
                if (timeLeft > 300) { // 300 seconds = 5 minutes
                    subscribeToMachine(machineId, savedEmail);
                } else {
                    showToast('Machine has less than 5 minutes remaining', 'warning');
                }
            } else {
                showToast('This machine is not currently in use', 'info');
            }
        } else {
            // If machine data isn't cached, fetch it
            fetch(`/api/machines/${machineId}`)
                .then(response => response.json())
                .then(machine => {
                    const isActive = machine.inUse && 
                                   machine.endTime && 
                                   new Date(machine.endTime) > new Date();
                    
                    if (isActive) {
                        const timeLeft = getTimeLeft(machine.endTime);
                        if (timeLeft > 300) {
                            subscribeToMachine(machineId, savedEmail);
                        } else {
                            showToast('Machine has less than 5 minutes remaining', 'warning');
                        }
                    } else {
                        showToast('This machine is not currently in use', 'info');
                    }
                })
                .catch(error => {
                    console.error('Error fetching machine:', error);
                    showToast('Error checking machine status', 'error');
                });
        }
        return;
    }
    
    // User has no email saved - show email modal
    if (!savedEmail) {
        const emailModal = document.getElementById('emailModal');
        selectedMachineId = machineId;
        
        if (emailModal) {
            // Update UI to indicate this is for notification
            const modalTitle = document.getElementById('emailModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Get Notified';
            }
            
            const modalDesc = document.getElementById('emailModalDesc');
            if (modalDesc) {
                modalDesc.textContent = `You'll only need to do this once to be notified when machines are ready.`;
            }
            
            emailModal.style.display = 'flex';
            
            // Update save button action
            const saveEmailButton = document.getElementById('saveEmailButton');
            if (saveEmailButton) {
                // Remove existing listeners
                const newButton = saveEmailButton.cloneNode(true);
                saveEmailButton.parentNode.replaceChild(newButton, saveEmailButton);
                
                // Add new listener for subscription
                newButton.addEventListener('click', async () => {
                    const emailInput = document.getElementById('emailInput');
                    if (!emailInput) return;
                    
                    const email = emailInput.value.trim();
                    if (isValidEmail(email)) {
                        localStorage.setItem('userEmail', email);
                        emailModal.style.display = 'none';
                        
                        // Now try to subscribe with the new email
                        const machine = machineData.find(m => m._id === machineId);
                        
                        if (machine) {
                            const isActive = machine.inUse && 
                                           machine.endTime && 
                                           new Date(machine.endTime) > new Date();
                            
                            if (isActive) {
                                const timeLeft = getTimeLeft(machine.endTime);
                                if (timeLeft > 300) {
                                    subscribeToMachine(machineId, email);
                                } else {
                                    showToast('Machine has less than 5 minutes remaining', 'warning');
                                }
                            } else {
                                showToast('This machine is not currently in use', 'info');
                            }
                        } else {
                            // Fetch if not in cache
                            fetch(`/api/machines/${machineId}`)
                                .then(response => response.json())
                                .then(machine => {
                                    const isActive = machine.inUse && 
                                                   machine.endTime && 
                                                   new Date(machine.endTime) > new Date();
                                    
                                    if (isActive) {
                                        const timeLeft = getTimeLeft(machine.endTime);
                                        if (timeLeft > 300) {
                                            subscribeToMachine(machineId, email);
                                        } else {
                                            showToast('Machine has less than 5 minutes remaining', 'warning');
                                        }
                                    } else {
                                        showToast('This machine is not currently in use', 'info');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error fetching machine:', error);
                                    showToast('Error checking machine status', 'error');
                                });
                        }
                    } else {
                        showToast('Please enter a valid email address', 'error');
                    }
                });
            }
        }
    }
}

// Fetch and update machines
async function fetchAndUpdateMachines(forceUpdate = false) {
    // Throttle API calls to prevent excessive requests
    const now = Date.now();
    if (!forceUpdate && now - lastFetchTime < FETCH_THROTTLE_MS) {
        // Instead of making a new request, just update the UI with existing data
        updateMachinesUI(machineData);
        return;
    }
    
    try {
        const response = await fetch('/api/machines', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            // Use cache for better performance on frequent updates
            cache: forceUpdate ? 'reload' : 'default'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Update our cache and last fetch time
        machineData = await response.json();
        lastFetchTime = now;
        
        // Update the UI with the new data
        updateMachinesUI(machineData);
    } catch (error) {
        console.error('Error fetching machines:', error);
        
        // Only show the error toast on forced updates or if we have no data
        if (forceUpdate || machineData.length === 0) {
            showToast('Failed to update machine status', 'error');
        }
        
        // If we have cached data, still update the UI with that
        if (machineData.length > 0) {
            updateMachinesUI(machineData);
        }
    }
}

// Update the UI with machine data
function updateMachinesUI(machines) {
    if (!machines || machines.length === 0) return;
    
    const machinesContainer = document.getElementById('machines');
    if (!machinesContainer) {
        console.error('Machines container not found');
        return;
    }
    
    // Store the current machine cards' toggle states before updating the DOM
    const currentMachineStates = {};
    document.querySelectorAll('.machine-card').forEach(card => {
        const machineId = card.dataset.machineId;
        const userUnsubscribed = card.getAttribute('data-user-unsubscribed') === 'true';
        
        if (machineId) {
            currentMachineStates[machineId] = { userUnsubscribed };
        }
    });
    
    // Create HTML for all machines
    machinesContainer.innerHTML = machines.map(machine => 
        createMachineHTML(machine, currentMachineStates[machine._id])
    ).join('');
    
    // Update the last updated timestamp
    updateLastUpdated();
    
    // Add click handlers to machine cards
    document.querySelectorAll('.machine-card').forEach(card => {
        const machineId = card.dataset.machineId;
        const machine = machines.find(m => m._id === machineId);
        
        if (machine) {
            card.addEventListener('click', () => handleMachineClick(machine));
        }
    });
    
    // Add click handlers to notification bells
    document.querySelectorAll('.notification-bell').forEach(bell => {
        const machineId = bell.dataset.machineId;
        bell.addEventListener('click', (e) => toggleNotification(e, machineId));
    });
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);