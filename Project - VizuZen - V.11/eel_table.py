
import bpy
import eel
import json
import threading

def run_eel():
    eel.init('web2')
    eel.start('index.html', mode='chrome', size=(800, 600))

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


# Clear existing exposed functions
eel._exposed_functions.clear()
eel.expose(get_object_data)

if __name__ == "__main__":
    register()
    eel_thread = threading.Thread(target=run_eel)
    eel_thread.daemon = True
    eel_thread.start()