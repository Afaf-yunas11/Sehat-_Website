import Spinner from "react-bootstrap/esm/Spinner";

const SpinnerComponent = ({size='lg'}) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Spinner animation="border" variant="primary" size={size} />
    </div>
  );
}
export default SpinnerComponent;