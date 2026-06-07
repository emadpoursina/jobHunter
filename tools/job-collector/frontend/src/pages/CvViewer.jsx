import { useParams } from 'react-router-dom';

export default function CvViewer() {
  const { id } = useParams();

  return (
    <div>
      <h1>CV Viewer</h1>
      <p className="subtitle">CV for job #{id}</p>
      <div className="page-stub">CV viewer — coming in Batch 14</div>
    </div>
  );
}
