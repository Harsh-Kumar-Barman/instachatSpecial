import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { Dialog, DialogContent } from '../ui/dialog'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

export default function Stories() {
  const [currentStory, setCurrentStory] = useState(0)
  const [progress, setProgress] = useState(0)
  const userDetails = useSelector((state) => state.counter.userDetails)
  const [stories, setStories] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  
  const getFollowing = async () => {
    try {
      const { data } = await axios.get(`/api/users/${userDetails.id}/following`)
      setStories(data?.stories)
    } catch (error) {
      console.error('Error fetching following users:', error)
    }
  }

  useEffect(() => {
    if (userDetails.id) {
      getFollowing()
    }
  }, [userDetails.id])

  useEffect(() => {
    let timer
    if (isOpen) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev < 100) {
            return prev + 1
          } else {
            if (currentStory === stories.length - 1) {
              closeStories() // Close if the last story is viewed
            } else {
              setCurrentStory((prevStory) => prevStory + 1)
            }
            return 0
          }
        })
      }, 50) // Adjust this value to change the story duration
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOpen, currentStory, stories.length])

  const openStories = (index) => {
    setIsOpen(true)
    setCurrentStory(index)
    setProgress(0)
  }

  const closeStories = () => {
    setIsOpen(false)
    setProgress(0)
  }

  const nextStory = () => {
    if (currentStory === stories.length - 1) {
      closeStories() // Close if the last story is reached
    } else {
      setCurrentStory((prev) => prev + 1)
      setProgress(0)
    }
  }

  const prevStory = () => {
    setCurrentStory((prev) => (prev > 0 ? prev - 1 : 0))
    setProgress(0)
  }

  return (
    <div className="relative mt-1">
      <ScrollArea className="w-11/12 whitespace-nowrap">
        <div ref={containerRef} className="flex space-x-4 p-1">
          {stories.map((story, index) => (
            <button
              key={story._id}
              className="flex aspect-square flex-col items-center space-y-1"
              onClick={() => openStories(index)}
            >
              <div className="rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                <Avatar className="w-16 h-16 border-2 border-black">
                  <AvatarImage className="object-cover object-top" src={story.user.profilePicture} alt={story.user.username} />
                  <AvatarFallback>{story.user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm w-16 text-center overflow-hidden">{story.user.username}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[350px] p-0 overflow-hidden">
          <div className="relative aspect-[9/16] bg-background">
            <Progress value={progress} className="absolute top-5 left-0 right-0 z-10 h-[2px] w-[98%]" />
            {stories.length > 0 && (
              <>
                <img
                  src={stories[currentStory]?.media}
                  alt={stories[currentStory]?.user?.username}
                  className="absolute aspect-auto inset-0 w-full h-full object-contain"
                />
                <div className="absolute top-10 left-4 ">
                  <Link className='flex items-center space-x-2' to={`/profile/${stories[currentStory]?.user?.username}`}>
                    <Avatar className="ring-2 ring-primary">
                      <AvatarImage className="object-cover object-top" src={stories[currentStory]?.user?.profilePicture} alt={stories[currentStory]?.user?.username} />
                      <AvatarFallback>{stories[currentStory]?.user?.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="dark:text-white font-semibold">{stories[currentStory]?.user?.username}</span>
                  </Link>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white rounded-full"
                  onClick={closeStories}
                >
                  <X className="h-6 w-6" />
                  <span className="sr-only">Close</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 text-white rounded-full"
                  onClick={prevStory}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous story</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-white rounded-full"
                  onClick={nextStory}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next story</span>
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
