import { config } from './config.js';

export class Avatar {
    constructor(scene, camera, room) {
        this.scene = scene;
        this.camera = camera;
        this.room = room;
        this.avatarMeshes = {}; // Store all avatar meshes
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            run: false
        };
        
        // Create player avatar
        this.createPlayerAvatar();
        
        // Set up controls
        this.setupControls();
        
        // Subscribe to presence updates
        this.room.subscribePresence(this.handlePresenceUpdate.bind(this));
    }
    
    createPlayerAvatar() {
        // The player's own avatar is represented by the camera
        this.playerHeight = 2;
        this.camera.position.set(0, this.playerHeight, 0);
        
        // Set up camera
        this.camera.rotation.order = 'YXZ';
        
        // Initialize player state
        this.velocity = new THREE.Vector3();
        this.jumping = false;
        this.onGround = true;
        
        // Update initial presence
        this.updatePresence();
    }
    
    createRemoteAvatar(clientId, data) {
        const username = this.room.peers[clientId]?.username || 'Unknown';
        const avatarUrl = this.room.peers[clientId]?.avatarUrl;
        
        // Create avatar body
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0x2194ce });
        const avatarMesh = new THREE.Mesh(geometry, material);
        avatarMesh.castShadow = true;
        
        // Position the avatar
        avatarMesh.position.set(data.x || 0, data.y || 0, data.z || 0);
        
        // Create nametag
        const nametagDiv = document.createElement('div');
        nametagDiv.className = 'nametag';
        nametagDiv.textContent = username;
        
        // Add avatar to scene
        this.scene.add(avatarMesh);
        
        // Store the avatar
        this.avatarMeshes[clientId] = {
            mesh: avatarMesh,
            nametag: nametagDiv,
            lastPosition: new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0),
            targetPosition: new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0),
            rotation: data.rotation || 0,
            username
        };
    }
    
    setupControls() {
        // Set up keyboard controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event.code);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event.code);
        });
        
        // Set up mouse controls for looking around
        this.mouseEnabled = false;
        
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left click
                this.mouseEnabled = true;
                document.body.requestPointerLock();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (document.pointerLockElement === null) {
                this.mouseEnabled = false;
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.mouseEnabled && document.pointerLockElement) {
                this.handleMouseMove(event.movementX, event.movementY);
            }
        });
    }
    
    handleKeyDown(code) {
        switch (code) {
            case 'KeyW':
                this.controls.forward = true;
                break;
            case 'KeyS':
                this.controls.backward = true;
                break;
            case 'KeyA':
                this.controls.left = true;
                break;
            case 'KeyD':
                this.controls.right = true;
                break;
            case 'Space':
                this.controls.jump = true;
                break;
            case 'ShiftLeft':
                this.controls.run = true;
                break;
        }
    }
    
    handleKeyUp(code) {
        switch (code) {
            case 'KeyW':
                this.controls.forward = false;
                break;
            case 'KeyS':
                this.controls.backward = false;
                break;
            case 'KeyA':
                this.controls.left = false;
                break;
            case 'KeyD':
                this.controls.right = false;
                break;
            case 'Space':
                this.controls.jump = false;
                break;
            case 'ShiftLeft':
                this.controls.run = false;
                break;
        }
    }
    
    handleMouseMove(movementX, movementY) {
        // Adjust camera rotation based on mouse movement
        const sensitivity = 0.002;
        this.camera.rotation.y -= movementX * sensitivity;
        this.camera.rotation.x = Math.max(
            -Math.PI / 2, 
            Math.min(Math.PI / 2, this.camera.rotation.x - movementY * sensitivity)
        );
        
        // Update presence with new rotation
        this.updatePresence();
    }
    
    handlePresenceUpdate(presenceData) {
        // Handle updates for all avatars except the player's
        const clientIds = Object.keys(presenceData);
        
        for (const clientId of clientIds) {
            if (clientId === this.room.clientId) continue; // Skip self
            
            const data = presenceData[clientId];
            if (!data) continue;
            
            if (!this.avatarMeshes[clientId]) {
                // Create new avatar
                this.createRemoteAvatar(clientId, data);
            } else {
                // Update existing avatar
                this.updateRemoteAvatar(clientId, data);
            }
        }
        
        // Remove avatars of disconnected users
        for (const clientId in this.avatarMeshes) {
            if (!presenceData[clientId]) {
                this.removeAvatar(clientId);
            }
        }
    }
    
    updateRemoteAvatar(clientId, data) {
        const avatar = this.avatarMeshes[clientId];
        if (!avatar) return;
        
        // Update target position for smooth interpolation
        avatar.targetPosition.set(data.x || 0, data.y || 0, data.z || 0);
        avatar.rotation = data.rotation || 0;
    }
    
    removeAvatar(clientId) {
        const avatar = this.avatarMeshes[clientId];
        if (avatar) {
            this.scene.remove(avatar.mesh);
            delete this.avatarMeshes[clientId];
        }
    }
    
    update(deltaTime) {
        this.updatePlayerMovement(deltaTime);
        this.updateRemoteAvatars(deltaTime);
    }
    
    updatePlayerMovement(deltaTime) {
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y -= config.gravity * deltaTime;
        } else {
            this.velocity.y = 0;
        }
        
        // Handle jumping
        if (this.controls.jump && this.onGround) {
            this.velocity.y = config.jumpForce;
            this.onGround = false;
        }
        
        // Calculate movement direction
        const speed = this.controls.run ? 
            config.avatarSpeed * config.avatarRunMultiplier : 
            config.avatarSpeed;
        
        // Reset horizontal velocity
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Apply input to velocity
        if (this.controls.forward) {
            this.velocity.x -= Math.sin(this.camera.rotation.y) * speed;
            this.velocity.z -= Math.cos(this.camera.rotation.y) * speed;
        }
        if (this.controls.backward) {
            this.velocity.x += Math.sin(this.camera.rotation.y) * speed;
            this.velocity.z += Math.cos(this.camera.rotation.y) * speed;
        }
        if (this.controls.left) {
            this.velocity.x -= Math.sin(this.camera.rotation.y + Math.PI/2) * speed;
            this.velocity.z -= Math.cos(this.camera.rotation.y + Math.PI/2) * speed;
        }
        if (this.controls.right) {
            this.velocity.x += Math.sin(this.camera.rotation.y + Math.PI/2) * speed;
            this.velocity.z += Math.cos(this.camera.rotation.y + Math.PI/2) * speed;
        }
        
        // Apply velocity to position
        this.camera.position.x += this.velocity.x * deltaTime;
        this.camera.position.y += this.velocity.y * deltaTime;
        this.camera.position.z += this.velocity.z * deltaTime;
        
        // Basic collision with ground
        if (this.camera.position.y < this.playerHeight) {
            this.camera.position.y = this.playerHeight;
            this.onGround = true;
        }
        
        // World boundaries
        const halfWorldSize = config.worldSize / 2;
        this.camera.position.x = Math.max(-halfWorldSize, Math.min(halfWorldSize, this.camera.position.x));
        this.camera.position.z = Math.max(-halfWorldSize, Math.min(halfWorldSize, this.camera.position.z));
        
        // Update presence if position changed
        this.updatePresence();
    }
    
    updateRemoteAvatars(deltaTime) {
        // Smoothly interpolate remote avatar positions
        for (const clientId in this.avatarMeshes) {
            const avatar = this.avatarMeshes[clientId];
            
            // Position interpolation
            avatar.mesh.position.lerp(avatar.targetPosition, 10 * deltaTime);
            
            // Rotation
            avatar.mesh.rotation.y = avatar.rotation;
        }
    }
    
    updatePresence() {
        // Throttle updates to avoid flooding the network
        if (this.updateTimeout) return;
        
        this.updateTimeout = setTimeout(() => {
            this.room.updatePresence({
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z,
                rotation: this.camera.rotation.y
            });
            this.updateTimeout = null;
        }, config.updateInterval);
    }
}

