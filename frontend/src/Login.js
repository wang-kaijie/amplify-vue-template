import React, { useState, useEffect } from "react";
import { ReactComponent as MegaphoneIcon } from "../assets/megaphone.svg";
import { ReactComponent as AscendaIcon } from "../assets/ascenda.svg";
import { FcGoogle } from "react-icons/fc";
import { IoMdMail } from "react-icons/io";
import { FaKey } from "react-icons/fa";

import {
  Button,
  Form,
  Container,
  Row,
  Col,
  InputGroup,
  FormControl,
  Alert,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import {
  signIn,
  confirmSignIn,
  signInWithRedirect,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  signOut as amplifySignOut,
} from "@aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useNavigate } from "react-router-dom";
import APIGATEWAY from "../apiConfig";
import { useUserRole } from "../context/UserRoleContext";

const Login = () => {
  const navigate = useNavigate();
  const { setUserRolePermissions, setRole } = useUserRole(); // Destructure the function from the context
  const {
    isAuthenticated,
    setIsAuthenticated,
    clearLocalStorage,
    setCurrentUserEmail,
    currentUserEmail,
  } = useAuth();
  const [authError, setAuthError] = useState("");
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [tempUsername, setTempUsername] = useState(""); // Changed to store username

  useEffect(() => {
    // This effect runs once on mount, to check the user's authentication state
    checkCurrentUser();

    // Listen for changes to authentication state
    const removeListener = Hub.listen("auth", async (data) => {
      const { payload } = data;
      if (payload.event === "signedIn") {
        setIsAuthenticated(true);
      }
      if (payload.event === "signedOut") {
        setIsAuthenticated(false);
        localStorage.clear();
        navigate("/login");
      }
    });

    // Cleanup listener when component unmounts
    return () => removeListener();
  }, []);

  const fetchUserRole = async () => {
    try {
      // Fetch the current session to get the access token
      const session = await fetchAuthSession();
      var curRole = "customer";
      const keyInLocal =
        "CognitoIdentityServiceProvider." +
        session.tokens.accessToken.payload.client_id +
        "." +
        session.tokens.accessToken.payload.username +
        ".accessToken";
      const token = localStorage.getItem(keyInLocal);
      localStorage.setItem("token", token);

      // Fetch user attributes from Cognito
      const userRole = await fetchUserAttributes();
      localStorage.setItem("userId", userRole["custom:userID"]);
      localStorage.setItem("email", userRole["email"]);
      localStorage.setItem("bank", userRole["custom:bank"]);
      setCurrentUserEmail(userRole["email"]);
      if (userRole && userRole["custom:role"]) {
        curRole = userRole["custom:role"];
      }
      setRole(curRole);
      localStorage.setItem("role", curRole);
      const bankValue = localStorage.getItem("bank");
      console.log(bankValue);
      if (!bankValue || bankValue === "undefined" || bankValue.trim() === "" || bankValue === undefined) {
        setAuthError(
          "You do not have permission to access this system. Please contact your administrator."
          );
          localStorage.clear();
      } else {
        // Now you can also make an API call to get permissions based on the role if needed
        const permissionsResponse = await fetch(
          `${APIGATEWAY}/role?roleName=${curRole}`,
          { headers: { Authorization: token } }
        );
        const permissionsData = await permissionsResponse.json();
        localStorage.setItem(
          "permissions",
          JSON.stringify(permissionsData.Permissions)
        );
        if (permissionsResponse.ok) {
          permissionsData.Permissions.push({ role: curRole });
          setUserRolePermissions(permissionsData.Permissions);
        } else {
          throw new Error("Error fetching user permissions");
        }
        navigate("/");
      }
    } catch (e) {
      console.error("Error fetching user role:", e);
    }
  };

  async function checkCurrentUser() {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // The user is authenticated, now let's fetch the user role.
        await fetchUserRole(); // This function will set the error and handle the navigation.
      }
    } catch (e) {
      // User is not authenticated, or an error occurred
      setIsAuthenticated(false);
      console.error("Error during current user check:", e);
    }
  }
  

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError("");

    try {
      const email = event.target.elements.email.value;
      const password = event.target.elements.password.value;
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });
      setCurrentUserEmail(email);

      if (
        nextStep &&
        nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setTempUsername(email); // Store the username for the next step
        setNewPasswordRequired(true); // Prompt user for new password
      } else {
        setIsAuthenticated(true);
        fetchUserRole();
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(
        "Authentication failed. Please check your credentials and try again."
      );
    }
  };

  const handleCompleteNewPassword = async (event) => {
    event.preventDefault();
    const newPassword = event.target.elements.newPassword.value;

    try {
      if (tempUsername) {
        const { isSignedIn } = await confirmSignIn({
          challengeResponse: newPassword,
          options: { username: tempUsername }, // Use the stored username
        });

        if (isSignedIn) {
          setIsAuthenticated(true);
          navigate("/");
        } else {
          // Handle additional steps if necessary
        }
      }
    } catch (error) {
      console.error("Error completing new password:", error);
      setAuthError("Error completing new password. Please try again.");
    }
  };

  const handleGoogleLogin = async () => {
    // Clear any existing error messages
    setAuthError("");
    localStorage.clear();
    try {
      // Explicitly sign out to reset any existing Amplify session
      console.log(isAuthenticated);
      if (isAuthenticated) {
        await amplifySignOut();
        setIsAuthenticated(false);
      }
  
      // Attempt to sign in with Google
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      console.error("Google login error:", error);
      setAuthError("Google authentication failed. Please try again.");
    }
  };
  
  return (
    <>
      <Container
        fluid
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "#195483" }}
      >
        <Row className="w-100">
          <Col
            lg={7}
            className="d-none d-lg-flex justify-content-center align-items-center"
          >
            <MegaphoneIcon
              className="img-fluid"
              style={{ maxHeight: "500px" }}
            />
          </Col>
          <Col
            xs={12}
            sm={12}
            md={12}
            lg={4}
            className="p-4 border-top border-primary rounded-lg shadow-lg bg-white "
          >
            {/* Display the error message if authentication failed */}
            {authError && (
              <Alert variant="danger" className="mb-3">
                {authError}
              </Alert>
            )}
            <h2 className="h2 font-weight-bold mb-4">
              Welcome to <br></br>
              <AscendaIcon style={{ height: "3rem", width: "auto" }} />
            </h2>
            <Button
              className="w-100 d-flex justify-content-center align-items-center mb-3"
              variant="outline-primary"
              onClick={handleGoogleLogin}
            >
              <FcGoogle className="h-6 w-6 mr-2" />
              Login with Google
            </Button>
            <hr />
            {!newPasswordRequired ? (
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <InputGroup>
                    <InputGroup.Text>
                      <IoMdMail />
                    </InputGroup.Text>
                    <FormControl
                      id="email"
                      type="email"
                      placeholder="Email"
                      required
                    />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <InputGroup>
                    <InputGroup.Text>
                      <FaKey />
                    </InputGroup.Text>
                    <FormControl
                      id="password"
                      type="password"
                      placeholder="Password"
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group as={Row}>
                  <Col sm={9}>
                    <Form.Check type="checkbox" label="Remember me" />
                  </Col>
                  <Col sm={3}>
                    <Button
                      variant="link"
                      className="text-decoration-none"
                      style={{ textColor: "#5D5C7E" }}
                    >
                      Forgot Password?
                    </Button>
                  </Col>
                </Form.Group>
                <Button
                  type="submit"
                  className="w-100 mb-3 mt-5"
                  style={{ backgroundColor: "#5D5C7E" }}
                >
                  Login
                </Button>
              </Form>
            ) : (
              <Form onSubmit={handleCompleteNewPassword}>
                <Form.Group className="mb-3">
                  <InputGroup>
                    <InputGroup.Text>
                      <FaKey />
                    </InputGroup.Text>
                    <FormControl
                      id="newPassword"
                      type="password"
                      placeholder="New Password"
                      required
                    />
                  </InputGroup>
                </Form.Group>
                <Button type="submit" className="w-100">
                  Set New Password
                </Button>
              </Form>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Login;

