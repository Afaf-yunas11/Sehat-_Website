import Spinner from "react-bootstrap/esm/Spinner";

const SpinnerComponent = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Spinner animation="border" variant="primary" />
    </div>
  );
}
export default SpinnerComponent;