import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useUserAuth } from "@/context/userAuthContext";
import { UserLogIn } from "@/types";
import { Label } from "@radix-ui/react-label";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

interface ILoginProps {}
const initialValue: UserLogIn = {
  email: "",
  password: "",
};

const Login: React.FunctionComponent<ILoginProps> = () => {
  const { googleSignIn, logIn } = useUserAuth();
  const navigate = useNavigate();
  const [userLogInInfo, setuserLogInInfo] = React.useState<UserLogIn>(initialValue);
  const [error, setError] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const handleGoogleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await googleSignIn();
      navigate("/");
    } catch (error: any) {
      setError(error.message || "Failed to sign in with Google");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userLogInInfo.email || !userLogInInfo.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await logIn(userLogInInfo.email, userLogInInfo.password);
      navigate("/");
    } catch (error: any) {
      setError(error.message || "Failed to log in");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#967bb6] min-h-screen w-full flex items-center justify-center">
      <div className="w-full max-w-md p-4">
        <Card className="bg-white/95 backdrop-blur shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold text-center mb-4 text-[#614C82]">
                CSD+
              </CardTitle>
              <CardDescription className="text-center text-[#725A97]">
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button 
                variant="outline" 
                onClick={handleGoogleSignIn}
                type="button"
                disabled={isLoading}
                className="w-full bg-white hover:bg-[#F3E8FF] border-[#E2D1F9]"
              >
                <Icons.google className="mr-2 h-4 w-4" />
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#E2D1F9]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-[#725A97]">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[#725A97]">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="dipesh@example.com"
                  value={userLogInInfo.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setuserLogInInfo({
                      ...userLogInInfo,
                      email: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  required
                  className="border-[#E2D1F9] focus:border-[#725A97] focus:ring-[#725A97]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-[#725A97]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={userLogInInfo.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setuserLogInInfo({
                      ...userLogInInfo,
                      password: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  required
                  className="border-[#E2D1F9] focus:border-[#725A97] focus:ring-[#725A97]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                className="w-full bg-[#614C82] hover:bg-[#523D73] text-white" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Sign In"}
              </Button>
              <p className="text-sm text-center text-[#725A97]">
                Don't have an account?{" "}
                <Link to="/signup" className="text-[#614C82] hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;