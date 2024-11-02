import osxphotos
import json
import os

def main():
    # Initialize the PhotosDB object
    photosdb = osxphotos.PhotosDB()
    
    # Get a list of AlbumInfo objects
    albums = photosdb.album_info
    
    albums_list = []
    for album in albums:
        albums_list.append({
            "title": album.title,
            "uuid": album.uuid
        })
    
    # Ensure the data directory exists
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Write the albums_list to a JSON file
    albums_json_path = os.path.join(data_dir, 'albums.json')
    with open(albums_json_path, 'w') as f:
        json.dump(albums_list, f, indent=4)
    
    print(f"Albums data has been written to {albums_json_path}")

if __name__ == "__main__":
    main()