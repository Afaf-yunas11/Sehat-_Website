import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import sehatLogo from '../assets/sehatLogo250.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import routes from '../routes/routes'; 


function Header({ firstName }) {
  return (
    <Navbar expand={true} className="bg-body-tertiary w-100">
      <Container fluid>
        <Navbar.Brand href={routes.home}>
          <img
            src={sehatLogo}
            alt="Sehat Logo"
            width="40"
            height="40"
            className="d-inline-block align-top"
          />{' '}
          <span style={{ fontSize:'24px', fontWeight: 'bold', marginLeft: '8px' }}>Sehat</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <NavDropdown title={`Hello, ${firstName}`} id="basic-nav-dropdown">
              <NavDropdown.Item href={routes.account}>Account</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item href={routes.logout}>
                Log out
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;