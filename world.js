import { config } from './config.js';

export class World {
    constructor(scene, room) {
        this.scene = scene;
        this.room = room;
        this.objects = {};
        
        // Initialize world grid
        this.createWorldGrid();
        
        // Initialize terrain
        this.createTerrain();
        
        // Subscribe to room state updates
        this.room.subscribeRoomState(this.handleRoomStateUpdate.bind(this));
    }
    
    createWorldGrid() {
        const gridHelper = new THREE.GridHelper(config.worldSize, config.worldSize / config.gridSize);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
    }
    
    createTerrain() {
        // Create a basic flat terrain
        const geometry = new THREE.PlaneGeometry(config.worldSize, config.worldSize);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3a7c44,
            roughness: 0.8,
            metalness: 0.2
        });
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);
    }
    
    handleRoomStateUpdate(state) {
        if (state.objects) {
            this.updateObjects(state.objects);
        }
    }
    
    updateObjects(newObjectsState) {
        // Add or update objects
        for (const [id, objectData] of Object.entries(newObjectsState)) {
            if (!objectData) {
                // Object was deleted
                if (this.objects[id]) {
                    this.scene.remove(this.objects[id].mesh);
                    delete this.objects[id];
                }
                continue;
            }
            
            if (!this.objects[id]) {
                // Create new object
                this.createObject(id, objectData);
            } else {
                // Update existing object
                this.updateObject(id, objectData);
            }
        }
    }
    
    createObject(id, data) {
        let geometry, material, mesh;
        
        switch (data.type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(data.width || 5, data.height || 5, data.depth || 5);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(data.radius || 2.5, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(data.radiusTop || 2, data.radiusBottom || 2, data.height || 5, 32);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(data.radius || 2.5, data.height || 5, 32);
                break;
            default:
                geometry = new THREE.BoxGeometry(5, 5, 5);
                break;
        }
        
        material = new THREE.MeshStandardMaterial({
            color: data.color || 0xffffff,
            roughness: data.roughness || 0.5,
            metalness: data.metalness || 0.5
        });
        
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(data.x || 0, data.y || 0, data.z || 0);
        mesh.rotation.set(data.rotationX || 0, data.rotationY || 0, data.rotationZ || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id, ...data };
        
        this.scene.add(mesh);
        this.objects[id] = { mesh, data };
    }
    
    updateObject(id, newData) {
        const existingObject = this.objects[id];
        
        // If the type changed, recreate the object
        if (existingObject.data.type !== newData.type) {
            this.scene.remove(existingObject.mesh);
            this.createObject(id, newData);
            return;
        }
        
        // Update position, rotation, etc.
        existingObject.mesh.position.set(newData.x || 0, newData.y || 0, newData.z || 0);
        existingObject.mesh.rotation.set(newData.rotationX || 0, newData.rotationY || 0, newData.rotationZ || 0);
        
        // Update material if color changed
        if (newData.color && newData.color !== existingObject.data.color) {
            existingObject.mesh.material.color.set(newData.color);
        }
        
        // Update userData
        existingObject.mesh.userData = { id, ...newData };
        existingObject.data = newData;
    }
    
    placeObject(type, position, properties = {}) {
        const id = `object-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const objectData = {
            type,
            x: position.x,
            y: position.y,
            z: position.z,
            ...properties,
            creator: this.room.clientId
        };
        
        // Update room state with new object
        const update = {
            objects: {
                [id]: objectData
            }
        };
        
        this.room.updateRoomState(update);
        return id;
    }
    
    removeObject(id) {
        // Check if the object exists and the current user is the creator
        const object = this.objects[id];
        if (object && object.data.creator === this.room.clientId) {
            const update = {
                objects: {
                    [id]: null
                }
            };
            this.room.updateRoomState(update);
        }
    }
    
    getObjectAtPosition(position, radius = 2) {
        // Find objects near the given position
        for (const [id, object] of Object.entries(this.objects)) {
            const distance = object.mesh.position.distanceTo(position);
            if (distance <= radius) {
                return { id, object: object.mesh, data: object.data };
            }
        }
        return null;
    }
}

