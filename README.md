# WebP Resizer & AI Image Editor

A modern, browser-based image editing tool built with React. This application provides entirely client-side AI background removal, intelligent foreground adjustments, and seamless conversion to the highly optimized WebP format.

## Features

- **AI Background Removal**: Automatically detect and remove image backgrounds using `@imgly/background-removal`. Runs locally in your browser for enhanced privacy.
- **Custom Background Management**: Upload your own backgrounds, apply them behind your extracted foregrounds, and save them straight to your browser's local storage for future reuse.
- **WebP Conversion & Resizing**: Easily scale images and convert your final compositions to WebP to save bandwidth without sacrificing quality.
- **Interactive Before/After Slider**: Compare your original image with the processed result using an intuitive draggable slider.
- **Foreground Adjustments**: Tweak, scale, and crop your extracted foregrounds for perfect placement.
- **Task History**: View your past image processing tasks saved automatically to your local storage.
- **Dark Mode Support**: A polished UI featuring a fully integrated dark/light theme toggle.

## Tech Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Processing**: `@imgly/background-removal`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```
