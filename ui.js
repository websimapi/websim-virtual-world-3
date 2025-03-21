import { config } from './config.js';

export class UI {
    constructor(room) {
        this.room = room;
        this.uiLayer = document.getElementById('ui-layer');
        this.loadingScreen = document.getElementById('loading-screen');
        
        // Initialize UI components
        this.buildPanel = null;
        this.playersList = null;
        this.chat = null;
        this.objectInfo = null;
        
        // Create UI components
        this.createBuildPanel();
        this.createPlayersList();
        this.createChat();
        this.createObjectInfo();
        
        // Subscribe to peer updates
        this.room.subscribe(this.updatePlayersList.bind(this));
        
        // Set up event handlers
        this.setupKeyboardShortcuts();
    }
    
    hideLoadingScreen() {
        this.loadingScreen.style.opacity = 0;
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 500);
    }
    
    createBuildPanel() {
        this.buildPanel = document.createElement('div');
        this.buildPanel.className = 'build-panel hidden';
        this.buildPanel.innerHTML = `
            <h2>Build Mode</h2>
            <div class="menu-section">
                <h3>Objects</h3>
                <div class="build-items">
                    <div class="build-item" data-type="cube">Cube</div>
                    <div class="build-item" data-type="sphere">Sphere</div>
                    <div class="build-item" data-type="cylinder">Cylinder</div>
                    <div class="build-item" data-type="cone">Cone</div>
                </div>
            </div>
            <div class="menu-section">
                <h3>Properties</h3>
                <div>
                    <label>Color: <input type="color" id="object-color" value="#4bb3fd"></label>
                </div>
                <div id="size-properties">
                    <div>
                        <label>Width: <input type="number" id="object-width" min="1" max="20" value="5"></label>
                    </div>
                    <div>
                        <label>Height: <input type="number" id="object-height" min="1" max="20" value="5"></label>
                    </div>
                    <div>
                        <label>Depth: <input type="number" id="object-depth" min="1" max="20" value="5"></label>
                    </div>
                </div>
                <div id="radius-property" class="hidden">
                    <label>Radius: <input type="number" id="object-radius" min="0.5" max="10" value="2.5"></label>
                </div>
            </div>
        `;
        this.uiLayer.appendChild(this.buildPanel);
        
        // Add event listeners
        const buildItems = this.buildPanel.querySelectorAll('.build-item');
        buildItems.forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                this.onObjectTypeSelected(type);
            });
        });
        
        // Property change listeners
        const colorInput = document.getElementById('object-color');
        colorInput.addEventListener('change', () => {
            this.onPropertyChanged('color', colorInput.value);
        });
        
        const widthInput = document.getElementById('object-width');
        widthInput.addEventListener('change', () => {
            this.onPropertyChanged('width', parseFloat(widthInput.value));
        });
        
        const heightInput = document.getElementById('object-height');
        heightInput.addEventListener('change', () => {
            this.onPropertyChanged('height', parseFloat(heightInput.value));
        });
        
        const depthInput = document.getElementById('object-depth');
        depthInput.addEventListener('change', () => {
            this.onPropertyChanged('depth', parseFloat(depthInput.value));
        });
        
        const radiusInput = document.getElementById('object-radius');
        radiusInput.addEventListener('change', () => {
            this.onPropertyChanged('radius', parseFloat(radiusInput.value));
        });
    }
    
    createPlayersList() {
        this.playersList = document.createElement('div');
        this.playersList.className = 'menu hidden';
        this.playersList.innerHTML = `
            <h2>Players</h2>
            <div class="player-list"></div>
        `;
        this.uiLayer.appendChild(this.playersList);
    }
    
    createChat() {
        this.chat = document.createElement('div');
        this.chat.className = 'chat-container hidden';
        this.chat.innerHTML = `
            <div class="chat-messages"></div>
            <div class="chat-input-container">
                <input type="text" class="chat-input" placeholder="Type a message...">
                <button class="chat-send">Send</button>
            </div>
        `;
        this.uiLayer.appendChild(this.chat);
        
        // Add event listeners
        const chatInput = this.chat.querySelector('.chat-input');
        const chatSend = this.chat.querySelector('.chat-send');
        
        chatSend.addEventListener('click', () => {
            this.sendChatMessage(chatInput.value);
            chatInput.value = '';
        });
        
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.sendChatMessage(chatInput.value);
                chatInput.value = '';
            }
        });
        
        // Subscribe to chat messages
        this.room.onmessage = (event) => {
            const data = event.data;
            if (data.type === 'chat') {
                this.addChatMessage(data.username, data.message);
            }
        };
    }
    
    createObjectInfo() {
        this.objectInfo = document.createElement('div');
        this.objectInfo.className = 'object-info hidden';
        this.objectInfo.innerHTML = `
            <h3>Object Info</h3>
            <div class="object-details"></div>
        `;
        this.uiLayer.appendChild(this.objectInfo);
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Tab':
                    event.preventDefault();
                    this.togglePlayersList();
                    break;
                case 'KeyT':
                    this.toggleChat();
                    break;
            }
        });
    }
    
    showBuildPanel() {
        this.buildPanel.classList.remove('hidden');
    }
    
    hideBuildPanel() {
        this.buildPanel.classList.add('hidden');
    }
    
    updateBuildSelection(type) {
        // Update UI to show selected object type
        const buildItems = this.buildPanel.querySelectorAll('.build-item');
        buildItems.forEach(item => {
            if (item.getAttribute('data-type') === type) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Show/hide the appropriate property inputs
        const sizeProps = document.getElementById('size-properties');
        const radiusProps = document.getElementById('radius-property');
        
        if (type === 'sphere' || type === 'cylinder' || type === 'cone') {
            sizeProps.classList.add('hidden');
            radiusProps.classList.remove('hidden');
        } else {
            sizeProps.classList.remove('hidden');
            radiusProps.classList.add('hidden');
        }
    }
    
    onObjectTypeSelected(type) {
        // This will be connected to the Building class
        if (this.onTypeSelectedCallback) {
            this.onTypeSelectedCallback(type);
        }
    }
    
    onPropertyChanged(property, value) {
        // This will be connected to the Building class
        if (this.onPropertyChangedCallback) {
            if (property === 'color') {
                // Convert HTML color to hex number
                value = parseInt(value.replace('#', '0x'), 16);
            }
            
            const properties = {};
            properties[property] = value;
            this.onPropertyChangedCallback(properties);
        }
    }
    
    setObjectTypeCallback(callback) {
        this.onTypeSelectedCallback = callback;
    }
    
    setPropertyChangeCallback(callback) {
        this.onPropertyChangedCallback = callback;
    }
    
    togglePlayersList() {
        this.playersList.classList.toggle('hidden');
    }
    
    updatePlayersList(peers) {
        const playerListElement = this.playersList.querySelector('.player-list');
        playerListElement.innerHTML = '';
        
        for (const clientId in peers) {
            const { username, avatarUrl } = peers[clientId];
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            const avatar = document.createElement('div');
            avatar.className = 'player-avatar';
            avatar.style.backgroundImage = `url(${avatarUrl || 'https://images.websim.ai/avatar/default'})`;
            
            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = username || 'Unknown';
            
            playerItem.appendChild(avatar);
            playerItem.appendChild(name);
            playerListElement.appendChild(playerItem);
        }
    }
    
    toggleChat() {
        this.chat.classList.toggle('hidden');
        if (!this.chat.classList.contains('hidden')) {
            this.chat.querySelector('.chat-input').focus();
        }
    }
    
    sendChatMessage(message) {
        if (!message.trim()) return;
        
        this.room.send({
            type: 'chat',
            message: message.trim()
        });
    }
    
    addChatMessage(username, message) {
        const chatMessages = this.chat.querySelector('.chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Limit chat history
        const messages = chatMessages.children;
        if (messages.length > config.chatHistoryLimit) {
            chatMessages.removeChild(messages[0]);
        }
        
        // Show chat if hidden
        if (this.chat.classList.contains('hidden')) {
            this.chat.classList.remove('hidden');
            setTimeout(() => {
                if (!this.chat.querySelector('.chat-input').value) {
                    this.chat.classList.add('hidden');
                }
            }, 5000);
        }
    }
    
    showObjectInfo(objectData) {
        if (!objectData) {
            this.objectInfo.classList.add('hidden');
            return;
        }
        
        const detailsContainer = this.objectInfo.querySelector('.object-details');
        detailsContainer.innerHTML = '';
        
        // Display object type
        const typeElement = document.createElement('p');
        typeElement.textContent = `Type: ${objectData.type}`;
        detailsContainer.appendChild(typeElement);
        
        // Display creator if available
        if (objectData.creator) {
            const creatorElement = document.createElement('p');
            const creatorName = this.room.peers[objectData.creator]?.username || 'Unknown';
            creatorElement.textContent = `Created by: ${creatorName}`;
            detailsContainer.appendChild(creatorElement);
        }
        
        // Show the panel
        this.objectInfo.classList.remove('hidden');
    }
    
    hideObjectInfo() {
        this.objectInfo.classList.add('hidden');
    }
}

