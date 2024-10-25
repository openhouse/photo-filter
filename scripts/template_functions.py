# ./scripts/template_functions.py

def get_extension(photo):
    """
    Returns the lowercased file extension of the photo's original filename.
    """
    ext = photo.original_filename.split('.')[-1].lower()
    return f".{ext}"
