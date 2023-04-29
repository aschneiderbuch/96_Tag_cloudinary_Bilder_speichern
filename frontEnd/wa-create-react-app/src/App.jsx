import logo from './logo.svg';
import './App.css';
import { useRef, useState } from 'react';

function App() {
  const imgRef = useRef()
  const [images, setImages] = useState([])

  const hochladenZuBackEnd = async () => {
    const form = new FormData();
    form.append('file', imgRef.current.files[0])
    form.append('name', 'nochEinBild')

    const response = await fetch('http://localhost:9999/directupload', {
      method: 'POST',
      body: form
    })

    const data = await response.json()
    setImages(prev => [...prev, data.url])
  }



  return (
    <section className="App">

      <article>
        <label htmlFor="file">Datei zum Hochladen</label>
        <input ref={imgRef} type="file" name="file" id="file" placeholder='max 2 MB' />
        <button onClick={hochladenZuBackEnd}>Hochladen zu BackEnd</button>
      </article>

      {
        images.map((img, key) => {
          return <img style={{ width: '25%' }} key={key} src={img} alt='hochgeladenes Bild' > </img>
        })
      }

    </section>
  );
}

export default App;
