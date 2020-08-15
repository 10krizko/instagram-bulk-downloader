# Instagram Bulk Downloader
Instagram Bulk Downloader is a script that downloads Instagram images in bulk. You feed it a textfile with URLs to public Instagram posts and it does the rest. Handy for downloading your own Saved posts - I couldn't find a simpler way of doing so. It works on single image posts and albums, doesn't work on videos. 

## Usage
1. Download the project.
2. `cd` to the project folder and create a textfile with Instagram post URLs separated by newline.
3. Run `npm install`
4. Run `node ig.js file.txt` where file.txt is your textfile.
5. You'll find the images in `path_to_project/downloaded/`