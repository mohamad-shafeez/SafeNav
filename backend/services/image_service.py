import os
import requests
import urllib.parse

def get_destination_image(query):
    api_key = os.environ.get("UNSPLASH_ACCESS_KEY") 
    
    # URL encode the query (e.g., 'New York' becomes 'New%20York')
    safe_query = urllib.parse.quote(query)
    url = f"https://api.unsplash.com/search/photos?query={safe_query}&client_id={api_key}&per_page=1"
    
    try:
        response = requests.get(url, timeout=5)
        # ⚠️ Check if the API key worked (will raise error if 401 or 403)
        response.raise_for_status() 
        
        data = response.json()
        if data.get('results') and len(data['results']) > 0:
            return data['results'][0]['urls']['regular']
            
        # Fallback if no search results found
        return "https://images.unsplash.com/photo-1488646953014-85cb44e25828"
        
    except Exception as e:
        print(f"❌ Image Fetch Error: {e}")
        # Default travel image if API fails or Key is missing
        return "https://images.unsplash.com/photo-1488646953014-85cb44e25828"