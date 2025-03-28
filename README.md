#  Online Markdown & MDX Editor with Live Docusaurus Preview  
## 🌟 Introduction  
This project is an online editor that allows users to write and organize their documentation using **MDX** and **Markdown**. It offers a real-time preview in a **Docusaurus** environment.
> **⚠️ Note:** Management of local file storage and usage with **RxDB** is still under development.
---
## 🚀 Main Features  
✔️ **MDX** Editor with **Docusaurus** support  
✔️ **Monaco** Editor if the file is not MDX  
✔️ Interactive file explorer  
✔️ Real-time preview  
✔️ Smooth and modern interface  
---
## 🏗️ Installation and Setup  
```bash
# Project clone
git clone https://github.com/osmel1/online-editor.git
cd vite-project
# Install dependencies
npm install
# Launch the project
npm run dev
```
---
## ⏳ First Launch  
During the first launch, the project performs several steps:  
1. **Project Creation** 🛠️  
2. **Dependency Installation** 📦  
3. **Initial Configuration** ⚙️  
An informative message will keep you updated on the progress. Once completed, the editor will display in **three sections**:
- 📂 **File Explorer**
- ✍️ **Code Editor**
- 👀 **Real-time Preview**
---
##  📸 Aperçu
![image](https://github.com/user-attachments/assets/83fe2ceb-2a02-49dd-9459-df42e9866d60)



![onlineEditor](https://github.com/user-attachments/assets/c8b9471f-00f5-4206-af32-1521f503732a)

---
## Technologies Used
- **Vite**: Fast build tool and development server for a modern web application.
- **React**: JavaScript library for building the user interface.
- **RxDB**: Reactive database for managing local data with synchronization.
- **@mdxeditor/editor**: Provides a live MDX editor for documentation.
- **@webcontainer/api**: Web-based container to run Node.js inside the browser.
- **pouchdb-adapter-idb**: IndexedDB adapter for storing data locally in the browser.
- **Lucide-react**: A collection of customizable icons for the UI.
---
## 📂 Project Structure  
```
📦 src
 ┣ 📂 assets          # Static resources
 ┣ 📂 components      # UI Components (Editor, Explorer, etc.)
 ┣ 📂 hooks           # Custom hooks (File management, WebContainers, etc.)
 ┣ 📂 utils           # Utility functions
 ┣ 📜 App.jsx         # Main entry point
 ┣ 📜 Database.jsx    # Database management (RxDB) ⚠️ Under development
 ┣ 📜 db.js           # Database configuration
 ┣ 📜 Schema.js       # Storage schema definition
```
---
## 🔧 Features Under Development  
- [ ] Improvement of local file storage via **RxDB**
- [ ] Editor performance optimization
---
## 🤝 Contributing  
Contributions are welcome! Feel free to suggest improvements or report bugs .
