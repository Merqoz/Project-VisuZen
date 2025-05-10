import bpy
import eel
import threading
import json

# Global variable to track current page and frame update state
current_page = None
is_updating = False  # Prevent recursive frame updates

def navigate_to_page(page_name):
    """Navigate to different pages and initialize correct web directory"""
    global current_page
    
    # Only reinitialize if we're changing pages
    if current_page != page_name:
        current_page = page_name
        if page_name == 'Project_Content':
            eel.init('web')
            return 'index.html'
        elif page_name == 'object-list':
            eel.init('web2')
            return 'index.html'
        elif page_name == 'settings':
            eel.init('web3')  # Changed to web3 for consistency
            return 'settings.html'
        elif page_name == 'table-of-contents':
            eel.init('web4')  # Changed to web4 for consistency
            return 'table-of-contents.html'
    
    # If already on the page, return current page
    return None

def run_eel():
    """Initialize and start Eel with the default page"""
    try:
        html_file = navigate_to_page('Project_Content')
        eel.start(html_file, mode='chrome', size=(800, 600))
    except Exception as e:
        print(f"Error starting Eel: {e}")

# Enhanced timeline functionality
def update_timeline(frame):
    """Update Blender's timeline to the specified frame"""
    global is_updating
    if not is_updating:
        try:
            is_updating = True
            bpy.context.scene.frame_set(int(frame))
            return bpy.context.scene.frame_current
        finally:
            is_updating = False

def get_current_frame():
    """Get the current frame from Blender's timeline"""
    return bpy.context.scene.frame_current

def set_current_frame(frame):
    """Set current frame with update protection"""
    global is_updating
    if not is_updating:
        try:
            is_updating = True
            bpy.context.scene.frame_current = frame
            eel.updateCurrentFrame(frame)()  # Update UI
        finally:
            is_updating = False

def update_markers(markers_data):
    """Update timeline markers with error handling"""
    try:
        scene = bpy.context.scene
        scene.timeline_markers.clear()
        for marker in markers_data:
            scene.timeline_markers.new(marker['name'], frame=marker['frame'])
    except Exception as e:
        print(f"Error updating markers: {e}")

@bpy.app.handlers.frame_change_post.append
def frame_change_handler(scene):
    """Handler for frame changes in Blender"""
    global is_updating
    if not is_updating:
        try:
            is_updating = True
            current_frame = scene.frame_current
            eel.updateCurrentFrame(current_frame)()
        except Exception as e:
            print(f"Error in frame change handler: {e}")
        finally:
            is_updating = False

def jump_to_next_marker():
    """Jump to next marker with error handling"""
    try:
        scene = bpy.context.scene
        current_frame = scene.frame_current
        next_marker = None
        for marker in scene.timeline_markers:
            if marker.frame > current_frame:
                if next_marker is None or marker.frame < next_marker.frame:
                    next_marker = marker
        if next_marker:
            set_current_frame(next_marker.frame)
        return scene.frame_current
    except Exception as e:
        print(f"Error jumping to next marker: {e}")
        return current_frame

def jump_to_previous_marker():
    """Jump to previous marker with error handling"""
    try:
        scene = bpy.context.scene
        current_frame = scene.frame_current
        prev_marker = None
        for marker in scene.timeline_markers:
            if marker.frame < current_frame:
                if prev_marker is None or marker.frame > prev_marker.frame:
                    prev_marker = marker
        if prev_marker:
            set_current_frame(prev_marker.frame)
        return scene.frame_current
    except Exception as e:
        print(f"Error jumping to previous marker: {e}")
        return current_frame

def switch_page(page_name):
    """Handle page switching requests from JavaScript"""
    try:
        new_page = navigate_to_page(page_name)
        if new_page:
            return {"success": True, "page": new_page}
        return {"success": False, "message": "Already on requested page"}
    except Exception as e:
        print(f"Error switching page: {e}")
        return {"success": False, "message": str(e)}

############################################################################################################

# eel_Blender_Contents Python script is moved here for now.

def get_object_data():
    data = []
    for obj in bpy.context.scene.objects:
        obj_data = {
            "name": obj.name,
            "category": get_category(obj),
            "wp": get_work_package(obj),
            "mn": obj.get("mn_custom_string", ""),
            "properties": get_custom_properties(obj)
        }
        data.append(obj_data)
    return json.dumps(data)

def get_category(obj):
    categories = ['-', 'Main Equipment', 'Tools', 'Auxiliary Equipment']
    try:
        return categories[int(obj.get("dropdown_list2", 0))]
    except (ValueError, IndexError):
        return "Uncategorized"

def get_work_package(obj):
    wp_list = ['WP_X', 'WP03', 'WP04', 'WP05', 'WP06', 'WP07', 'WP08', 'WP09', 'WP10', 'RTP', 'CPI']
    try:
        return wp_list[int(obj.get("dropdown_list1", 0))]
    except (ValueError, IndexError):
        return "Unknown"

def get_custom_properties(obj):
    props = {}
    for i in range(1, 100):  # Assuming a maximum of 99 rows
        row_props = {}
        for col in range(1, 5):  # 4 columns
            key = f"custom_string_{i}_{col}"
            if key in obj:
                row_props[f"col{col}"] = obj[key]
        if row_props:
            props[f"row{i}"] = row_props
        else:
            break  # No more rows
    return props


def update_eel_data(dummy):
    eel.updateTable(get_object_data())

class EelOperator(bpy.types.Operator):
    bl_idname = "wm.run_eel"
    bl_label = "Run Eel"

    def execute(self, context):
        threading.Thread(target=run_eel, daemon=True).start()
        return {'FINISHED'}

def register():
    bpy.utils.register_class(EelOperator)
    bpy.app.handlers.depsgraph_update_post.append(update_eel_data)

def unregister():
    bpy.utils.unregister_class(EelOperator)
    bpy.app.handlers.depsgraph_update_post.remove(update_eel_data)



###################################################################################3

def register():
    """Register handlers and initialize timeline sync"""
    try:
        # Remove any existing handlers first
        unregister()
        
        # Add frame change handler
        if frame_change_handler not in bpy.app.handlers.frame_change_post:
            bpy.app.handlers.frame_change_post.append(frame_change_handler)
        
        # Clear and re-expose functions
        eel._exposed_functions.clear()
        
        # Expose functions to JavaScript
        eel.expose(update_markers)
        eel.expose(get_current_frame)
        eel.expose(set_current_frame)
        eel.expose(update_timeline)
        eel.expose(jump_to_next_marker)
        eel.expose(jump_to_previous_marker)
        eel.expose(switch_page)
        eel.expose(get_object_data)
        
        print("Timeline handlers registered successfully")
    except Exception as e:
        print(f"Error in register: {e}")

def unregister():
    """Unregister handlers and cleanup"""
    try:
        # Remove frame change handler
        if frame_change_handler in bpy.app.handlers.frame_change_post:
            bpy.app.handlers.frame_change_post.remove(frame_change_handler)
        
        print("Timeline handlers unregistered successfully")
    except Exception as e:
        print(f"Error in unregister: {e}")

# Main execution
if __name__ == "__main__":
    register()
    try:
        eel_thread = threading.Thread(target=run_eel)
        eel_thread.daemon = True
        eel_thread.start()
    except Exception as e:
        print(f"Error starting Eel thread: {e}")



# Register the operators
if __name__ == "__main__":
    register()
    eel_thread = threading.Thread(target=run_eel)
    eel_thread.daemon = True
    eel_thread.start()