import { useParams } from 'react-router-dom';

export default function JobDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1>Job Detail</h1>
      <p className="subtitle">Job #{id}</p>
      <div className="page-stub">Job detail — coming in Batch 14</div>
    </div>
  );
}
