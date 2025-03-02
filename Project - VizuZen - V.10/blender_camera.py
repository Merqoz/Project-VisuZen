import bpy
import base64
import os
import tempfile
import json
import math
import eel
import bpy.types

def capture_viewport_screenshot():
    """Capture a screenshot from the current viewport"""
    try:
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Save viewport screenshot
        bpy.ops.screen.screenshot(filepath=temp_path, full=False)
        
        # Read image and convert to base64
        with open(temp_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
            
        # Clean up
        os.unlink(temp_path)
        
        return img_data
    except Exception as e:
        print(f"Error capturing viewport screenshot: {e}")
        import traceback
        traceback.print_exc()
        return None

def render_camera_view(camera_obj):
    """Render an image from the camera's perspective"""
    try:
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Store original settings
        original_camera = bpy.context.scene.camera
        original_filepath = bpy.context.scene.render.filepath
        original_resolution_x = bpy.context.scene.render.resolution_x
        original_resolution_y = bpy.context.scene.render.resolution_y
        original_percentage = bpy.context.scene.render.resolution_percentage
        
        # Set render settings
        bpy.context.scene.camera = camera_obj
        bpy.context.scene.render.filepath = temp_path
        bpy.context.scene.render.resolution_x = 800  # Lower resolution for faster preview
        bpy.context.scene.render.resolution_y = 600
        bpy.context.scene.render.resolution_percentage = 50
        
        # Render
        bpy.ops.render.render(write_still=True)
        
        # Restore original settings
        bpy.context.scene.camera = original_camera
        bpy.context.scene.render.filepath = original_filepath
        bpy.context.scene.render.resolution_x = original_resolution_x
        bpy.context.scene.render.resolution_y = original_resolution_y
        bpy.context.scene.render.resolution_percentage = original_percentage
        
        # Read image and convert to base64
        with open(temp_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
            
        # Clean up
        os.unlink(temp_path)
        
        return img_data
    except Exception as e:
        print(f"Error rendering camera view: {e}")
        import traceback
        traceback.print_exc()
        return None

@eel.expose
def add_camera_at_current_view(section_id, camera_number, frame, render_preview=False):
    """Add a camera at the current view in Blender"""
    try:
        # Create a new camera
        camera_data = bpy.data.cameras.new(f"Camera_{section_id}_{camera_number}")
        camera_obj = bpy.data.objects.new(f"Camera_{section_id}_{camera_number}", camera_data)
        
        # Link the camera to the scene
        bpy.context.scene.collection.objects.link(camera_obj)
        
        # Find active 3D viewport
        view3d = None
        region3d = None
        
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == 'VIEW_3D':
                    for space in area.spaces:
                        if space.type == 'VIEW_3D':
                            view3d = space
                            region3d = space.region_3d
                            break
                    if view3d:
                        break
            if view3d:
                break
                
        if not view3d or not region3d:
            raise Exception("No active 3D viewport found")
        
        # Copy view to camera
        camera_obj.matrix_world = region3d.view_matrix.inverted()
        
        # Get camera position and rotation
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        
        # Add custom properties to the camera
        camera_obj["section_id"] = section_id
        camera_obj["camera_number"] = camera_number
        camera_obj["camera_frame"] = frame
        camera_obj["camera_name"] = f"Camera {camera_number}"
        
        # Capture preview image (either simple screenshot or rendered view)
        preview_image = None
        if render_preview:
            preview_image = render_camera_view(camera_obj)
        else:
            preview_image = capture_viewport_screenshot()
        
        # Create camera data for UI
        camera_data = {
            "name": f"Camera {camera_number}",
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": frame,
            "preview_image": preview_image,
            "blender_name": camera_obj.name
        }
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error adding camera: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
def update_camera_from_current_view(section_id, camera_number, frame, render_preview=False):
    """Update an existing camera from the current view"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Find active 3D viewport
        view3d = None
        region3d = None
        
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == 'VIEW_3D':
                    for space in area.spaces:
                        if space.type == 'VIEW_3D':
                            view3d = space
                            region3d = space.region_3d
                            break
                    if view3d:
                        break
            if view3d:
                break
                
        if not view3d or not region3d:
            raise Exception("No active 3D viewport found")
        
        # Copy view to camera
        camera_obj.matrix_world = region3d.view_matrix.inverted()
        
        # Update camera properties
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        camera_obj["camera_frame"] = frame
        
        # Capture preview image (either simple screenshot or rendered view)
        preview_image = None
        if render_preview:
            preview_image = render_camera_view(camera_obj)
        else:
            preview_image = capture_viewport_screenshot()
        
        # Create updated camera data for UI
        camera_data = {
            "name": camera_obj.get("camera_name", f"Camera {camera_number}"),
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": frame,
            "preview_image": preview_image,
            "blender_name": camera_obj.name
        }
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error updating camera: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
def jump_to_camera_view(section_id, camera_number):
    """Jump to a specific camera view in Blender"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Set the active camera
        bpy.context.scene.camera = camera_obj
        
        # Change to camera view in all 3D viewports
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces[0].region_3d.view_perspective = 'CAMERA'
        
        # Set frame if camera has one
        if camera_obj.get("camera_frame"):
            bpy.context.scene.frame_set(camera_obj["camera_frame"])
        
        return {"success": True}
    except Exception as e:
        print(f"Error jumping to camera view: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
def delete_camera(section_id, camera_number):
    """Delete a camera from Blender"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Delete the camera
        camera_data = camera_obj.data
        bpy.data.objects.remove(camera_obj)
        bpy.data.cameras.remove(camera_data)
        
        return {"success": True}
    except Exception as e:
        print(f"Error deleting camera: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
def get_camera_data(section_id, camera_number):
    """Get data for a specific camera"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Get camera properties
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        
        # Create camera data for UI
        camera_data = {
            "name": camera_obj.get("camera_name", f"Camera {camera_number}"),
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": camera_obj.get("camera_frame", 0),
            "blender_name": camera_obj.name
        }
        
        # Try to get a new preview image
        preview_image = capture_viewport_screenshot()
        if preview_image:
            camera_data["preview_image"] = preview_image
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error getting camera data: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}