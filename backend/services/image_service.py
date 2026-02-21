import os
import requests

def get_destination_image(query):
    # We ask for the NAME of the variable in the .env, not the value itself
    api_key = os.environ.get("UNSPLASH_ACCESS_KEY") 
    
    url = f"https://api.unsplash.com/search/photos?query={query}&client_id={api_key}&per_page=1"
    
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        if data.get('results'):
            return data['results'][0]['urls']['regular']
        return "https://images.unsplash.com/photo-1488646953014-85cb44e25828"
    except Exception as e:
        print(f"Image Fetch Error: {e}")
        return "https://images.unsplash.com/photo-1488646953014-85cb44e25828"